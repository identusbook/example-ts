import type {
  CredentialSchemaInput,
  JsonObject,
  JsonValue,
} from "@/lib/flighttix/domain";

export interface ConnectionInvitation {
  from: string;
  id: string;
  invitationUrl: string;
  type?: string;
}

export interface ConnectionRecord {
  connectionId: string;
  thid?: string;
  label?: string;
  myDid?: string;
  theirDid?: string;
  role?: string;
  state?: string;
  invitation: ConnectionInvitation;
  createdAt?: string;
  updatedAt?: string;
  metaRetries?: number;
  self?: string;
  kind?: string;
}

export interface ConnectionsPage {
  contents: ConnectionRecord[];
  kind: string;
  self: string;
  pageOf: string;
}

export interface ManagedDid {
  did: string;
  longFormDid?: string;
  status: string;
}

export interface ManagedDidPage {
  contents: ManagedDid[];
  kind: string;
  self: string;
  pageOf: string;
}

export interface CreateManagedDidResponse {
  longFormDid: string;
}

export interface DidOperationResponse {
  scheduledOperation?: {
    didRef?: string;
    [key: string]: JsonValue | undefined;
  };
}

export interface CredentialSchemaResponse extends CredentialSchemaInput {
  guid: string;
  id: string;
  longId?: string;
  authored?: string;
  resolutionMethod?: string;
  kind?: string;
  self?: string;
}

export interface CredentialSchemaPage {
  contents: CredentialSchemaResponse[];
  kind: string;
  self: string;
  pageOf: string;
}

export interface IssueCredentialRecord {
  recordId: string;
  thid: string;
  credentialFormat: string;
  validityPeriod?: number;
  claims: JsonObject;
  automaticIssuance?: boolean;
  createdAt: string;
  updatedAt?: string;
  role: string;
  protocolState: string;
  credential?: string;
  issuingDID?: string;
  myDid?: string;
  metaRetries: number;
}

export interface PresentationStatus {
  presentationId: string;
  thid: string;
  role: string;
  status: string;
  proofs?: Array<{
    schemaId: string;
    trustIssuers?: string[];
  }>;
  data?: string[];
  requestData?: string[];
  disclosedClaims?: JsonValue;
  connectionId?: string;
  metaRetries: number;
}

export interface PresentationStatusPage {
  contents: PresentationStatus[];
  kind: string;
  self: string;
  pageOf: string | number;
}
