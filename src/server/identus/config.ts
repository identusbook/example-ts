export interface FlightTixConfig {
  mediatorUrl: string;
  cloudAgentUrl: string;
  cloudAgentSchemaBaseUrl: string;
  cloudAgentApiKey?: string;
  cloudAgentConnectionLabel: string;
  passportStableSchemaId: string;
  ticketStableSchemaId: string;
  walletDbName: string;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function env(name: string, fallback: string): string {
  return optionalEnv(name) ?? fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

export function getFlightTixConfig(): FlightTixConfig {
  const cloudAgentUrl = trimTrailingSlash(
    env("CLOUD_AGENT_URL", "http://localhost:8000/cloud-agent"),
  );

  return {
    mediatorUrl: trimTrailingSlash(
      env("NEXT_PUBLIC_MEDIATOR_URL", "http://localhost:8080"),
    ),
    cloudAgentUrl,
    cloudAgentSchemaBaseUrl: trimTrailingSlash(
      env("CLOUD_AGENT_SCHEMA_BASE_URL", cloudAgentUrl),
    ),
    cloudAgentApiKey: optionalEnv("CLOUD_AGENT_API_KEY"),
    cloudAgentConnectionLabel: env(
      "FLIGHTTIX_CLOUD_AGENT_LABEL",
      "FlightTixTS-CloudAgent",
    ),
    passportStableSchemaId: env(
      "FLIGHTTIX_PASSPORT_SCHEMA_ID",
      "https://identusbook.com/flighttix-passport-1.0.0",
    ),
    ticketStableSchemaId: env(
      "FLIGHTTIX_TICKET_SCHEMA_ID",
      "https://identusbook.com/flighttix-ticket-1.0.0",
    ),
    walletDbName: env("FLIGHTTIX_WALLET_DB_NAME", "flighttix-wallet"),
  };
}

export function getPublicFlightTixConfig() {
  const config = getFlightTixConfig();

  return {
    mediatorUrl: config.mediatorUrl,
    cloudAgentConnectionLabel: config.cloudAgentConnectionLabel,
    passportStableSchemaId: config.passportStableSchemaId,
    ticketStableSchemaId: config.ticketStableSchemaId,
    walletDbName: config.walletDbName,
  };
}
