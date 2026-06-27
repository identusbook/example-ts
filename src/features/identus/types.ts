import type {
  CredentialKind,
  Flight,
  PassportClaims,
  TicketClaims,
} from "@/lib/flighttix/domain";
import type { PresentationStatus } from "@/server/identus/cloud-agent";

export type IdentusStatus =
  | "disconnected"
  | "startingAgent"
  | "startingDIDCommMessageListener"
  | "creatingConnectionToCloudAgent"
  | "issuerDIDAlreadyExists"
  | "creatingIssuerDID"
  | "publishingIssuerDID"
  | "issuerDIDPublished"
  | "checkingPassportSchema"
  | "creatingPassportSchema"
  | "createdPassportSchema"
  | "ready"
  | "error";

export const identusStatusLabels: Record<IdentusStatus, string> = {
  disconnected: "Disconnected",
  startingAgent: "Starting Agent",
  startingDIDCommMessageListener: "Starting DIDComm Message Listener",
  creatingConnectionToCloudAgent: "Creating Connection to Cloud Agent",
  issuerDIDAlreadyExists: "Issuer DID Already Exists",
  creatingIssuerDID: "Creating New Issuer DID",
  publishingIssuerDID: "Publishing Issuer DID",
  issuerDIDPublished: "Issuer DID Published",
  checkingPassportSchema: "Checking Passport Schema",
  creatingPassportSchema: "Creating Passport Schema",
  createdPassportSchema: "Created Passport Schema",
  ready: "Ready",
  error: "Error",
};

export type IdentusDebugLevel = "info" | "success" | "warning" | "error";

export interface IdentusDebugEvent {
  level: IdentusDebugLevel;
  message: string;
}

export interface IdentusDebugLogEntry extends IdentusDebugEvent {
  id: number;
  timestamp: string;
}

export interface IdentusSnapshot {
  status: IdentusStatus;
  error?: string;
  connectionId?: string;
  debugEvent?: IdentusDebugEvent;
  issuerDID?: string;
  passportSchemaGuid?: string;
  ticketSchemaGuid?: string;
  lastEvent?: string;
}

export interface Passport {
  id: string;
  name: string;
  did?: string;
  passportNumber: string;
  dob: string;
  dateOfIssuance?: string;
}

export interface Ticket {
  price: number;
  departure: string;
  arrival: string;
}

export interface RegistrationInput {
  name: string;
  passportNumber: string;
  dob: string;
}

export interface ProofRequestResult {
  kind: CredentialKind;
  presentation: PresentationStatus;
  requestedAt: string;
  schemaGuid: string;
}

export type SecurityReviewStatus =
  | "pending"
  | "accepted"
  | "denied"
  | "not-presented";

export interface SecurityPresentationRecord {
  id: string;
  protocolStatus: string;
  requestedAt: string;
  requestedSchemaGuid: string;
  reviewStatus: SecurityReviewStatus;
  passportValid: boolean;
  ticketValid: boolean;
  proofSentAt?: string;
  reviewedAt?: string;
  threadId?: string;
}

export interface FlightTixWallet {
  start(): Promise<IdentusSnapshot>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  issuePassport(input: RegistrationInput): Promise<void>;
  issueTicket(flight: Flight): Promise<void>;
  requestProof(kind: "passport" | "ticket"): Promise<ProofRequestResult>;
  readPassport(): Promise<Passport | undefined>;
  readTicket(): Promise<Ticket | undefined>;
  getSnapshot(): IdentusSnapshot;
}

export type CredentialClaims = PassportClaims | TicketClaims;
