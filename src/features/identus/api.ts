import type {
  CredentialKind,
  Flight,
  JsonObject,
  PassportClaims,
  TicketClaims,
} from "@/lib/flighttix/domain";
import type {
  ConnectionRecord,
  ConnectionsPage,
  CredentialSchemaPage,
  CredentialSchemaResponse,
  IssueCredentialRecord,
  ManagedDid,
  ManagedDidPage,
  PresentationStatus,
} from "@/server/identus/cloud-agent";
import type { MediatorInfo } from "@/server/identus/mediator";

export interface PublicFlightTixConfig {
  mediatorUrl: string;
  cloudAgentConnectionLabel: string;
  passportStableSchemaId: string;
  ticketStableSchemaId: string;
  walletDbName: string;
}

export async function getPublicConfig(): Promise<PublicFlightTixConfig> {
  return apiJson("/api/flighttix/config");
}

export async function getFlights(): Promise<Flight[]> {
  return apiJson("/api/flighttix/flights");
}

export async function getMediator(): Promise<MediatorInfo> {
  return apiJson("/api/flighttix/mediator");
}

export async function getConnections(): Promise<ConnectionsPage> {
  return apiJson("/api/flighttix/cloud-agent/connections");
}

export async function createConnection(): Promise<ConnectionRecord> {
  return apiJson("/api/flighttix/cloud-agent/connections", {
    method: "POST",
  });
}

export async function getDids(): Promise<ManagedDidPage> {
  return apiJson("/api/flighttix/cloud-agent/dids");
}

export async function createIssuerDid(): Promise<{ longFormDid: string }> {
  return apiJson("/api/flighttix/cloud-agent/dids", {
    method: "POST",
  });
}

export async function getDid(didRef: string): Promise<ManagedDid> {
  return apiJson(
    `/api/flighttix/cloud-agent/dids/${encodeURIComponent(didRef)}`,
  );
}

export async function publishDid(didRef: string): Promise<unknown> {
  return apiJson(
    `/api/flighttix/cloud-agent/dids/${encodeURIComponent(didRef)}/publications`,
    {
      method: "POST",
    },
  );
}

export async function getSchema(
  guid: string,
): Promise<CredentialSchemaResponse> {
  return apiJson(
    `/api/flighttix/cloud-agent/schemas?guid=${encodeURIComponent(guid)}`,
  );
}

export async function getSchemas(): Promise<CredentialSchemaPage> {
  return apiJson("/api/flighttix/cloud-agent/schemas");
}

export async function createSchema(
  kind: CredentialKind,
  author: string,
): Promise<CredentialSchemaResponse> {
  return apiJson("/api/flighttix/cloud-agent/schemas", {
    method: "POST",
    body: {
      kind,
      author,
    },
  });
}

export async function createCredentialOffer(input: {
  kind: CredentialKind;
  connectionId: string;
  issuingDID: string;
  schemaGuid: string;
  claims: PassportClaims | TicketClaims;
}): Promise<IssueCredentialRecord> {
  return apiJson("/api/flighttix/cloud-agent/credential-offers", {
    method: "POST",
    body: input,
  });
}

export async function createPresentation(input: {
  connectionId: string;
  issuerDID: string;
  schemaGuid: string;
}): Promise<PresentationStatus> {
  return apiJson("/api/flighttix/cloud-agent/presentations", {
    method: "POST",
    body: input,
  });
}

export async function getPresentation(
  presentationId: string,
): Promise<PresentationStatus> {
  return apiJson(
    `/api/flighttix/cloud-agent/presentations/${encodeURIComponent(
      presentationId,
    )}`,
  );
}

async function apiJson<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: JsonObject;
  } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers:
      options.body === undefined
        ? undefined
        : {
            "content-type": "application/json",
          },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const error =
      body && typeof body === "object" && "error" in body
        ? String(body.error)
        : `API request failed with HTTP ${response.status}`;
    throw new Error(error);
  }

  return body as T;
}
