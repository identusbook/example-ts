export const walletStorageKeys = {
  seed: "FlightTix.Seed",
  cloudAgentConnectionId: "FlightTix.CloudAgentConnectionId",
  cloudAgentIssuerDID: "FlightTix.CloudAgentIssuerDID",
  passportSchemaGuid: "FlightTix.PassportSchemaGuid",
  ticketSchemaGuid: "FlightTix.TicketSchemaGuid",
  passportVCThid: "FlightTix.PassportVCThid",
  ticketVCThid: "FlightTix.TicketVCThid",
  authValid: "FlightTix.AuthValid",
  lastMessageCreatedTime: "FlightTix.LastMessageCreatedTime",
} as const;

export type WalletStorageKey =
  (typeof walletStorageKeys)[keyof typeof walletStorageKeys];

const allKeys = Object.values(walletStorageKeys);

export function readStorage(key: WalletStorageKey): string | undefined {
  return localStorage.getItem(key) ?? undefined;
}

export function writeStorage(key: WalletStorageKey, value: string): void {
  localStorage.setItem(key, value);
}

export function deleteStorage(key: WalletStorageKey): void {
  localStorage.removeItem(key);
}

export function readBoolean(key: WalletStorageKey): boolean {
  return readStorage(key) === "true";
}

export function writeBoolean(key: WalletStorageKey, value: boolean): void {
  writeStorage(key, value ? "true" : "false");
}

export function readNumber(key: WalletStorageKey): number | undefined {
  const value = readStorage(key);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readSeed(): Uint8Array | undefined {
  const value = readStorage(walletStorageKeys.seed);
  return value ? base64ToBytes(value) : undefined;
}

export function writeSeed(seed: Uint8Array): void {
  writeStorage(walletStorageKeys.seed, bytesToBase64(seed));
}

export async function clearWalletStorage(walletDbName: string): Promise<void> {
  for (const key of allKeys) {
    localStorage.removeItem(key);
  }

  await deleteIndexedDb(walletDbName);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function deleteIndexedDb(dbName: string): Promise<void> {
  if (!("indexedDB" in globalThis)) {
    return;
  }

  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
