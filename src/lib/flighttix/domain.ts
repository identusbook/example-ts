export type CredentialKind = "passport" | "ticket";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface Flight {
  id: string;
  departure: string;
  arrival: string;
  price: number;
}

export type PassportClaims = JsonObject & {
  name: string;
  dateOfIssuance: string;
  passportNumber: string;
  dob: string;
};

export type TicketClaims = JsonObject & {
  name: string;
  dateOfIssuance: string;
  flightId: string;
  price: number;
  departure: string;
  arrival: string;
};

export interface CredentialSchemaInput {
  guid?: string;
  name: string;
  version: string;
  description: string;
  type: string;
  author: string;
  tags: string[];
  schema: JsonObject;
}

export interface CreateCredentialOfferRequest<TClaims extends JsonObject> {
  validityPeriod: number;
  schemaId: string;
  credentialFormat: "JWT";
  claims: TClaims;
  automaticIssuance: boolean;
  issuingDID: string;
  connectionId: string;
}

export interface CreateProofPresentationRequest {
  connectionId: string;
  options: {
    challenge: string;
    domain: string;
  };
  proofs: Array<{
    schemaId: string;
    trustIssuers?: string[];
  }>;
}

export const flightCatalog: Flight[] = [
  {
    id: "atl-scl",
    departure: "ATL",
    arrival: "SCL",
    price: 500,
  },
  {
    id: "sfo-tyo",
    departure: "SFO",
    arrival: "TYO",
    price: 800,
  },
  {
    id: "las-vie",
    departure: "LAS",
    arrival: "VIE",
    price: 700,
  },
];

export function createPassportSchema(
  author: string,
  stableSchemaId: string,
): CredentialSchemaInput {
  return {
    name: "passport",
    version: "1.0.0",
    description: "Passport Schema",
    type: "https://w3c-ccg.github.io/vc-json-schemas/schema/2.0/schema.json",
    author,
    tags: ["passport", "schema"],
    schema: {
      $id: stableSchemaId,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      description: "Passport",
      type: "object",
      properties: {
        name: { type: "string" },
        dateOfIssuance: { type: "string", format: "date-time" },
        passportNumber: { type: "string" },
        dob: { type: "string", format: "date-time" },
      },
      required: ["name", "dateOfIssuance", "passportNumber", "dob"],
      additionalProperties: true,
    },
  };
}

export function createTicketSchema(
  author: string,
  stableSchemaId: string,
): CredentialSchemaInput {
  return {
    name: "ticket",
    version: "1.0.0",
    description: "Ticket Schema",
    type: "https://w3c-ccg.github.io/vc-json-schemas/schema/2.0/schema.json",
    author,
    tags: ["ticket", "schema"],
    schema: {
      $id: stableSchemaId,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      description: "Ticket",
      type: "object",
      properties: {
        name: { type: "string" },
        dateOfIssuance: { type: "string", format: "date-time" },
        price: { type: "number" },
        departure: { type: "string" },
        arrival: { type: "string" },
        flightId: { type: "string" },
      },
      required: ["name", "dateOfIssuance"],
      additionalProperties: true,
    },
  };
}

export function schemaUrlFromGuid(
  cloudAgentSchemaBaseUrl: string,
  guid: string,
): string {
  return `${cloudAgentSchemaBaseUrl.replace(/\/$/, "")}/schema-registry/schemas/${guid}/schema`;
}

export function createPassportOfferRequest(input: {
  claims: PassportClaims;
  connectionId: string;
  issuingDID: string;
  schemaGuid: string;
  cloudAgentSchemaBaseUrl: string;
}): CreateCredentialOfferRequest<PassportClaims & JsonObject> {
  return {
    validityPeriod: 3600,
    schemaId: schemaUrlFromGuid(
      input.cloudAgentSchemaBaseUrl,
      input.schemaGuid,
    ),
    credentialFormat: "JWT",
    claims: input.claims as PassportClaims & JsonObject,
    automaticIssuance: true,
    issuingDID: input.issuingDID,
    connectionId: input.connectionId,
  };
}

export function createTicketOfferRequest(input: {
  claims: TicketClaims;
  connectionId: string;
  issuingDID: string;
  schemaGuid: string;
  cloudAgentSchemaBaseUrl: string;
}): CreateCredentialOfferRequest<TicketClaims & JsonObject> {
  return {
    validityPeriod: 3600,
    schemaId: schemaUrlFromGuid(
      input.cloudAgentSchemaBaseUrl,
      input.schemaGuid,
    ),
    credentialFormat: "JWT",
    claims: input.claims as TicketClaims & JsonObject,
    automaticIssuance: true,
    issuingDID: input.issuingDID,
    connectionId: input.connectionId,
  };
}

export function createProofRequest(input: {
  connectionId: string;
  issuerDID: string;
  schemaGuid: string;
  cloudAgentSchemaBaseUrl: string;
}): CreateProofPresentationRequest {
  return {
    connectionId: input.connectionId,
    options: {
      challenge: crypto.randomUUID(),
      domain: "identusbook.com",
    },
    proofs: [
      {
        schemaId: schemaUrlFromGuid(
          input.cloudAgentSchemaBaseUrl,
          input.schemaGuid,
        ),
        trustIssuers: [input.issuerDID],
      },
    ],
  };
}
