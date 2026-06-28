import type {
  CreateCredentialOfferRequest,
  CreateProofPresentationRequest,
  CredentialSchemaInput,
  JsonObject,
  JsonValue,
} from "@/lib/flighttix/domain";
import type {
  ConnectionRecord,
  ConnectionsPage,
  CreateManagedDidResponse,
  CredentialSchemaPage,
  CredentialSchemaResponse,
  DidOperationResponse,
  IssueCredentialRecord,
  ManagedDid,
  ManagedDidPage,
  PresentationStatus,
  PresentationStatusPage,
} from "@/lib/identus/cloud-agent-types";
import { type FlightTixConfig, getFlightTixConfig } from "./config";

export class CloudAgentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: JsonValue | undefined,
  ) {
    super(message);
    this.name = "CloudAgentError";
  }
}

const issuerDidRequest = {
  documentTemplate: {
    publicKeys: [
      { id: "auth-1", purpose: "authentication" },
      { id: "issue-1", purpose: "assertionMethod" },
    ],
    services: [],
  },
};

export class CloudAgentClient {
  constructor(
    private readonly config: FlightTixConfig = getFlightTixConfig(),
  ) {}

  async health(): Promise<JsonValue> {
    return this.request("/_system/health");
  }

  async getConnections(): Promise<ConnectionsPage> {
    return this.request("/connections");
  }

  async createConnection(): Promise<ConnectionRecord> {
    return this.request("/connections", {
      method: "POST",
      body: {
        label: this.config.cloudAgentConnectionLabel,
      },
    });
  }

  async getDids(): Promise<ManagedDidPage> {
    return this.request("/did-registrar/dids");
  }

  async createIssuerDid(): Promise<CreateManagedDidResponse> {
    return this.request("/did-registrar/dids", {
      method: "POST",
      body: issuerDidRequest,
    });
  }

  async getDid(didRef: string): Promise<ManagedDid> {
    return this.request(`/did-registrar/dids/${encodeURIComponent(didRef)}`);
  }

  async publishDid(didRef: string): Promise<DidOperationResponse> {
    return this.request(
      `/did-registrar/dids/${encodeURIComponent(didRef)}/publications`,
      {
        method: "POST",
        body: { didRef },
      },
    );
  }

  async createSchema(
    schema: CredentialSchemaInput,
  ): Promise<CredentialSchemaResponse> {
    return this.request("/schema-registry/schemas", {
      method: "POST",
      body: schema,
    });
  }

  async getSchema(guid: string): Promise<CredentialSchemaResponse> {
    return this.request(`/schema-registry/schemas/${encodeURIComponent(guid)}`);
  }

  async getSchemas(): Promise<CredentialSchemaPage> {
    return this.request("/schema-registry/schemas");
  }

  async createCredentialOffer(
    request: CreateCredentialOfferRequest<JsonObject>,
  ): Promise<IssueCredentialRecord> {
    return this.request("/issue-credentials/credential-offers", {
      method: "POST",
      body: request,
    });
  }

  async getCredentialRecord(recordId: string): Promise<IssueCredentialRecord> {
    return this.request(
      `/issue-credentials/records/${encodeURIComponent(recordId)}`,
    );
  }

  async createPresentation(
    request: CreateProofPresentationRequest,
  ): Promise<PresentationStatus> {
    return this.request("/present-proof/presentations", {
      method: "POST",
      body: request,
    });
  }

  async getPresentations(): Promise<PresentationStatusPage> {
    return this.request("/present-proof/presentations");
  }

  async getPresentation(presentationId: string): Promise<PresentationStatus> {
    return this.request(
      `/present-proof/presentations/${encodeURIComponent(presentationId)}`,
    );
  }

  async updatePresentation(
    presentationId: string,
    request: JsonObject,
  ): Promise<PresentationStatus> {
    return this.request(
      `/present-proof/presentations/${encodeURIComponent(presentationId)}`,
      {
        method: "PATCH",
        body: request,
      },
    );
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH";
      body?: unknown;
    } = {},
  ): Promise<T> {
    const headers = new Headers({
      accept: "application/json",
    });

    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
    }

    if (this.config.cloudAgentApiKey) {
      headers.set("apikey", this.config.cloudAgentApiKey);
    }

    const response = await fetch(`${this.config.cloudAgentUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw new CloudAgentError(
        `Cloud Agent request failed with HTTP ${response.status}`,
        response.status,
        body,
      );
    }

    return body as T;
  }
}

export function cloudAgentClient(): CloudAgentClient {
  return new CloudAgentClient();
}

async function parseResponseBody(response: Response): Promise<JsonValue> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return text;
  }
}
