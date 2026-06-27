"use client";

import { Buffer } from "buffer";
import type { CredentialKind, Flight } from "@/lib/flighttix/domain";
import {
  createConnection,
  createCredentialOffer,
  createIssuerDid,
  createPresentation,
  createSchema,
  getConnections,
  getDid,
  getDids,
  getMediator,
  getPublicConfig,
  getSchema,
  type PublicFlightTixConfig,
  publishDid,
} from "./api";
import {
  claimsFromCredential,
  credentialMatchesSchema,
  numberClaim,
  stringClaim,
} from "./credentials";
import { decodeFlightTixProtocolMessage } from "./protocol";
import type {
  DidcommMessage,
  DidcommMessageBatch,
  IdentusAgent,
  IdentusApollo,
  IdentusPluto,
  IdentusSdk,
  VerifiableCredential,
} from "./sdk-types";
import {
  clearWalletStorage,
  deleteStorage,
  readBoolean,
  readNumber,
  readSeed,
  readStorage,
  walletStorageKeys,
  writeBoolean,
  writeSeed,
  writeStorage,
} from "./storage";
import type {
  FlightTixWallet,
  IdentusSnapshot,
  IdentusStatus,
  Passport,
  RegistrationInput,
  Ticket,
} from "./types";

const didStatusPublished = "PUBLISHED";
const issuerDidPollLimit = 120;
const issuerDidPollDelayMs = 1000;

export class BrowserFlightTixWallet implements FlightTixWallet {
  private sdk?: IdentusSdk;
  private agent?: IdentusAgent;
  private pluto?: IdentusPluto;
  private config?: PublicFlightTixConfig;
  private processedMessageIds = new Set<string>();
  private snapshot: IdentusSnapshot = { status: "disconnected" };

  constructor(
    private readonly onSnapshot: (snapshot: IdentusSnapshot) => void = () => {},
  ) {}

  getSnapshot(): IdentusSnapshot {
    return this.snapshot;
  }

  async start(): Promise<IdentusSnapshot> {
    try {
      this.setStatus("startingAgent");
      this.config = await getPublicConfig();
      const mediator = await getMediator();
      const sdk = await this.loadSdk();
      const apollo = new sdk.Apollo();
      const seed = this.getOrCreateSeed(apollo);
      const pluto = await sdk.Pluto.create({
        dbName: this.config.walletDbName,
        keyRestoration: apollo,
      });
      const agent = sdk.Agent.initialize({
        apollo,
        pluto,
        mediatorDID: mediator.did,
        seed: async () => seed,
      });

      this.sdk = sdk;
      this.pluto = pluto;
      this.agent = agent;
      agent.addListener(sdk.ListenerKey.MESSAGE, (messages) =>
        this.handleMessages(messages),
      );

      await agent.start();
      this.setStatus("startingDIDCommMessageListener");
      await agent.startFetchingMessages(5000);

      const connectionId = await this.ensureCloudAgentConnection();
      const issuerDID = await this.ensureIssuerDID();
      const passportSchemaGuid = await this.ensureSchema("passport");

      this.setStatus("ready", {
        connectionId,
        issuerDID,
        passportSchemaGuid,
        ticketSchemaGuid: readStorage(walletStorageKeys.ticketSchemaGuid),
      });
      return this.snapshot;
    } catch (error) {
      this.setStatus("error", {
        error:
          error instanceof Error ? error.message : "Identus startup failed",
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.agent?.stopFetchingMessages();
    await this.agent?.stop();
    await this.pluto?.stop();
    this.agent = undefined;
    this.pluto = undefined;
    this.setStatus("disconnected");
  }

  async reset(): Promise<void> {
    const config = this.config ?? (await getPublicConfig());
    await this.stop().catch(() => undefined);
    await clearWalletStorage(config.walletDbName);
    this.processedMessageIds.clear();
    this.setStatus("disconnected");
  }

  async isLoggedIn(): Promise<boolean> {
    if (readBoolean(walletStorageKeys.authValid)) {
      return true;
    }

    const schemaGuid = readStorage(walletStorageKeys.passportSchemaGuid);
    if (!schemaGuid) {
      return false;
    }

    const credential = await this.findCredentialBySchema(schemaGuid);
    const isLoggedIn = credential !== undefined;
    writeBoolean(walletStorageKeys.authValid, isLoggedIn);
    return isLoggedIn;
  }

  async issuePassport(input: RegistrationInput): Promise<void> {
    const connectionId = await this.requireConnectionId();
    const issuingDID = await this.requirePublishedIssuerDID();
    const schemaGuid = await this.ensureSchema("passport");
    const record = await createCredentialOffer({
      kind: "passport",
      connectionId,
      issuingDID,
      schemaGuid,
      claims: {
        name: input.name,
        dateOfIssuance: new Date().toISOString(),
        passportNumber: input.passportNumber,
        dob: input.dob,
      },
    });
    writeStorage(walletStorageKeys.passportVCThid, record.thid);
    deleteStorage(walletStorageKeys.authValid);
  }

  async issueTicket(flight: Flight): Promise<void> {
    const connectionId = await this.requireConnectionId();
    const issuingDID = await this.requirePublishedIssuerDID();
    const schemaGuid = await this.ensureSchema("ticket");
    const record = await createCredentialOffer({
      kind: "ticket",
      connectionId,
      issuingDID,
      schemaGuid,
      claims: {
        name: flight.id,
        dateOfIssuance: new Date().toISOString(),
        flightId: flight.id,
        price: flight.price,
        departure: flight.departure,
        arrival: flight.arrival,
      },
    });
    writeStorage(walletStorageKeys.ticketVCThid, record.thid);
  }

  async requestProof(kind: CredentialKind): Promise<void> {
    const connectionId = await this.requireConnectionId();
    const issuerDID = await this.requirePublishedIssuerDID();
    const schemaGuid = await this.ensureSchema(kind);
    await createPresentation({ connectionId, issuerDID, schemaGuid });
  }

  async readPassport(): Promise<Passport | undefined> {
    const schemaGuid = readStorage(walletStorageKeys.passportSchemaGuid);
    if (!schemaGuid) {
      return undefined;
    }

    const credential = await this.findCredentialBySchema(schemaGuid);
    if (!credential) {
      return undefined;
    }

    const claims = claimsFromCredential(credential);
    const name = stringClaim(claims, "name");
    const passportNumber = stringClaim(claims, "passportNumber");
    const dob = stringClaim(claims, "dob");

    if (!name || !passportNumber || !dob) {
      return undefined;
    }

    return {
      id: credential.id,
      name,
      did: credential.subject,
      passportNumber,
      dob,
      dateOfIssuance: stringClaim(claims, "dateOfIssuance"),
    };
  }

  async readTicket(): Promise<Ticket | undefined> {
    const schemaGuid = readStorage(walletStorageKeys.ticketSchemaGuid);
    if (!schemaGuid) {
      return undefined;
    }

    const credential = await this.findCredentialBySchema(schemaGuid);
    if (!credential) {
      return undefined;
    }

    const claims = claimsFromCredential(credential);
    const departure = stringClaim(claims, "departure");
    const arrival = stringClaim(claims, "arrival");
    const price = numberClaim(claims, "price");

    if (!departure || !arrival || price === undefined) {
      return undefined;
    }

    return { departure, arrival, price };
  }

  private async loadSdk(): Promise<IdentusSdk> {
    if (this.sdk) {
      return this.sdk;
    }

    if (!("Buffer" in globalThis)) {
      Object.assign(globalThis, { Buffer });
    }

    this.sdk = await import("@hyperledger/identus-sdk");
    return this.sdk;
  }

  private getOrCreateSeed(apollo: IdentusApollo): Uint8Array {
    const stored = readSeed();
    if (stored) {
      return stored;
    }

    const { seed } = apollo.createRandomSeed();
    writeSeed(seed.value);
    return seed.value;
  }

  private async ensureCloudAgentConnection(): Promise<string> {
    this.setStatus("creatingConnectionToCloudAgent");
    const storedConnectionId = readStorage(
      walletStorageKeys.cloudAgentConnectionId,
    );
    const connections = await getConnections();
    const existing = connections.contents.find(
      (connection) =>
        connection.connectionId === storedConnectionId &&
        connection.label === this.requireConfig().cloudAgentConnectionLabel,
    );

    if (existing) {
      return existing.connectionId;
    }

    const connection = await createConnection();
    const invitationUrl = connection.invitation?.invitationUrl;
    const agent = this.requireAgent();

    if (!invitationUrl) {
      throw new Error(
        "Cloud Agent connection did not include an invitation URL",
      );
    }

    const invitation = await agent.parseOOBInvitation(new URL(invitationUrl));
    await agent.acceptInvitation(invitation);
    writeStorage(
      walletStorageKeys.cloudAgentConnectionId,
      connection.connectionId,
    );

    return connection.connectionId;
  }

  private async ensureIssuerDID(): Promise<string> {
    const stored = readStorage(walletStorageKeys.cloudAgentIssuerDID);
    if (stored) {
      return this.ensureDIDPublished(stored);
    }

    const dids = await getDids();
    const existing = dids.contents.find((did) => Boolean(did?.did));
    if (existing?.did) {
      writeStorage(walletStorageKeys.cloudAgentIssuerDID, existing.did);
      this.setStatus("issuerDIDAlreadyExists", { issuerDID: existing.did });
      return this.ensureDIDPublished(existing.did);
    }

    this.setStatus("creatingIssuerDID");
    const created = await createIssuerDid();
    const resolved = await getDid(created.longFormDid);
    writeStorage(walletStorageKeys.cloudAgentIssuerDID, resolved.did);
    return this.ensureDIDPublished(resolved.did);
  }

  private async ensureDIDPublished(didRef: string): Promise<string> {
    let did = await getDid(didRef);
    if (did.status === didStatusPublished) {
      this.setStatus("issuerDIDPublished", { issuerDID: did.did });
      return did.did;
    }

    this.setStatus("publishingIssuerDID", { issuerDID: did.did });
    await publishDid(did.did);

    for (let attempt = 0; attempt < issuerDidPollLimit; attempt += 1) {
      await delay(issuerDidPollDelayMs);
      did = await getDid(did.did);

      if (did.status === didStatusPublished) {
        this.setStatus("issuerDIDPublished", { issuerDID: did.did });
        return did.did;
      }
    }

    throw new Error("Issuer DID publication timed out");
  }

  private async ensureSchema(kind: CredentialKind): Promise<string> {
    const storageKey =
      kind === "passport"
        ? walletStorageKeys.passportSchemaGuid
        : walletStorageKeys.ticketSchemaGuid;
    const existingGuid = readStorage(storageKey);

    if (existingGuid) {
      try {
        await getSchema(existingGuid);
        return existingGuid;
      } catch {
        deleteStorage(storageKey);
      }
    }

    if (kind === "passport") {
      this.setStatus("checkingPassportSchema");
      this.setStatus("creatingPassportSchema");
    }

    const author = await this.requirePublishedIssuerDID();
    const schema = await createSchema(kind, author);
    writeStorage(storageKey, schema.guid);

    if (kind === "passport") {
      this.setStatus("createdPassportSchema", {
        passportSchemaGuid: schema.guid,
      });
    }

    return schema.guid;
  }

  private async requireConnectionId(): Promise<string> {
    return (
      readStorage(walletStorageKeys.cloudAgentConnectionId) ??
      (await this.ensureCloudAgentConnection())
    );
  }

  private async requirePublishedIssuerDID(): Promise<string> {
    const issuerDID = readStorage(walletStorageKeys.cloudAgentIssuerDID);
    if (!issuerDID) {
      return this.ensureIssuerDID();
    }

    return this.ensureDIDPublished(issuerDID);
  }

  private async handleMessages(messages: DidcommMessageBatch): Promise<void> {
    const agent = this.requireAgent();
    let newestCreatedTime =
      readNumber(walletStorageKeys.lastMessageCreatedTime) ?? 0;

    for (const message of messages) {
      if (
        this.processedMessageIds.has(message.id) ||
        message.createdTime < newestCreatedTime
      ) {
        continue;
      }

      this.processedMessageIds.add(message.id);
      newestCreatedTime = Math.max(newestCreatedTime, message.createdTime);

      const protocolMessage = decodeFlightTixProtocolMessage(message);
      switch (protocolMessage.kind) {
        case "offer": {
          if (!this.shouldAcceptOffer(protocolMessage.thid)) {
            break;
          }

          const request = await agent.prepareRequestCredentialWithIssuer(
            protocolMessage.message,
          );
          await agent.send(request.makeMessage());
          this.setEvent("Credential offer accepted");
          break;
        }
        case "issue": {
          await agent.processIssuedCredentialMessage(protocolMessage.message);
          deleteStorage(walletStorageKeys.authValid);
          this.setEvent("Credential stored");
          break;
        }
        case "presentationRequest": {
          const credential = await this.findCredentialForPresentation(message);
          if (credential) {
            const presentation = await agent.createPresentationForRequestProof(
              protocolMessage.message,
              credential,
            );
            await agent.send(presentation.makeMessage());
            this.setEvent("Presentation sent");
          } else {
            this.setEvent("No matching credential for presentation request");
          }
          break;
        }
        case "ignored":
          break;
      }
    }

    writeStorage(
      walletStorageKeys.lastMessageCreatedTime,
      String(newestCreatedTime),
    );
  }

  private shouldAcceptOffer(thid?: string): boolean {
    return Boolean(
      thid &&
        (thid === readStorage(walletStorageKeys.passportVCThid) ||
          thid === readStorage(walletStorageKeys.ticketVCThid)),
    );
  }

  private async findCredentialForPresentation(
    message: DidcommMessage,
  ): Promise<VerifiableCredential | undefined> {
    const ticketSchemaGuid = readStorage(walletStorageKeys.ticketSchemaGuid);
    const serializedMessage = JSON.stringify(message);

    if (ticketSchemaGuid && serializedMessage.includes(ticketSchemaGuid)) {
      return this.findCredentialBySchema(ticketSchemaGuid);
    }

    const passportSchemaGuid = readStorage(
      walletStorageKeys.passportSchemaGuid,
    );
    if (passportSchemaGuid && serializedMessage.includes(passportSchemaGuid)) {
      return this.findCredentialBySchema(passportSchemaGuid);
    }
  }

  private async findCredentialBySchema(
    schemaGuid: string,
  ): Promise<VerifiableCredential | undefined> {
    const credentials = await this.requireAgent().verifiableCredentials();
    return credentials.find((credential) =>
      credentialMatchesSchema(credential, schemaGuid),
    );
  }

  private requireAgent(): IdentusAgent {
    if (!this.agent) {
      throw new Error("Identus agent is not started");
    }

    return this.agent;
  }

  private requireConfig(): PublicFlightTixConfig {
    if (!this.config) {
      throw new Error("FlightTix config has not loaded");
    }

    return this.config;
  }

  private setStatus(
    status: IdentusStatus,
    patch: Partial<IdentusSnapshot> = {},
  ): void {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      status,
      error: status === "error" ? patch.error : undefined,
    };
    this.onSnapshot(this.snapshot);
  }

  private setEvent(lastEvent: string): void {
    this.snapshot = { ...this.snapshot, lastEvent };
    this.onSnapshot(this.snapshot);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
