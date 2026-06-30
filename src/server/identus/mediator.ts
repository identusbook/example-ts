import type { MediatorInfo } from "@/lib/identus/mediator-types";
import { getFlightTixConfig } from "./config";

export async function getMediatorInfo(): Promise<MediatorInfo> {
  const mediatorUrl = getFlightTixConfig().mediatorUrl;
  await mediatorText(mediatorUrl, "/health");

  return {
    health: "ok",
    version: await mediatorText(mediatorUrl, "/version"),
    did: await mediatorText(mediatorUrl, "/did"),
    invitationOOB: await mediatorText(mediatorUrl, "/invitationOOB"),
  };
}

async function mediatorText(baseUrl: string, path: string): Promise<string> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Mediator request ${path} failed with HTTP ${response.status}`,
    );
  }

  return text.trim();
}
