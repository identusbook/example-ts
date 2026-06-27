import type { VerifiableCredential } from "./sdk-types";

export function credentialMatchesSchema(
  credential: VerifiableCredential,
  schemaGuid: string,
): boolean {
  return credentialSchemaIds(credential).some((schemaId) =>
    schemaId.includes(`/schemas/${schemaGuid}/schema`),
  );
}

export function claimsFromCredential(
  credential: VerifiableCredential,
): Record<string, unknown> {
  const claims: Record<string, unknown> = {};

  for (const claim of credential.claims) {
    if ("name" in claim && "value" in claim) {
      claims[String(claim.name)] = claim.value;
    } else {
      Object.assign(claims, claim);
    }
  }

  const storable = credential.isStorable()
    ? credential.toStorable()
    : undefined;
  const parsed = parseMaybeJson(storable?.credentialData);
  Object.assign(claims, claimsFromUnknown(parsed));

  return claims;
}

export function stringClaim(
  claims: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = claims[key];
  return typeof value === "string" ? value : undefined;
}

export function numberClaim(
  claims: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = claims[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function credentialSchemaIds(credential: VerifiableCredential): string[] {
  const ids: string[] = [];
  const storable = credential.isStorable()
    ? credential.toStorable()
    : undefined;

  if (storable?.credentialSchema) {
    ids.push(storable.credentialSchema);
  }

  if (storable?.credentialData) {
    ids.push(...schemaIdsFromUnknown(parseMaybeJson(storable.credentialData)));
  }

  ids.push(...schemaIdsFromUnknown(credential.properties));
  return [...new Set(ids)];
}

function schemaIdsFromUnknown(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (value instanceof Map) {
    return schemaIdsFromUnknown(Object.fromEntries(value));
  }

  if (Array.isArray(value)) {
    return value.flatMap(schemaIdsFromUnknown);
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const direct = record.credentialSchema;
  const ids: string[] = [];

  if (typeof direct === "string") {
    ids.push(direct);
  } else if (Array.isArray(direct)) {
    for (const item of direct) {
      if (item && typeof item === "object") {
        const id = (item as Record<string, unknown>).id;
        if (typeof id === "string") {
          ids.push(id);
        }
      }
    }
  }

  for (const nested of Object.values(record)) {
    ids.push(...schemaIdsFromUnknown(nested));
  }

  return ids;
}

function claimsFromUnknown(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;
  const vc = record.vc;
  const credentialSubject = record.credentialSubject;

  if (credentialSubject && typeof credentialSubject === "object") {
    return credentialSubject as Record<string, unknown>;
  }

  if (vc && typeof vc === "object") {
    const vcSubject = (vc as Record<string, unknown>).credentialSubject;
    if (vcSubject && typeof vcSubject === "object") {
      return vcSubject as Record<string, unknown>;
    }
  }

  return {};
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
