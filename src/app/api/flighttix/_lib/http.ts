import { NextResponse } from "next/server";
import type { JsonObject } from "@/lib/flighttix/domain";
import { CloudAgentError } from "@/server/identus/cloud-agent";

export class RouteInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteInputError";
  }
}

export async function respond(
  handler: () => Promise<unknown> | unknown,
): Promise<NextResponse> {
  try {
    return NextResponse.json(await handler());
  } catch (error) {
    if (error instanceof CloudAgentError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.status },
      );
    }

    if (error instanceof RouteInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}

export async function readJsonObject(request: Request): Promise<JsonObject> {
  const body = (await request.json()) as unknown;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RouteInputError("Expected a JSON object body");
  }

  return body as JsonObject;
}

export function requiredString(body: JsonObject, key: string): string {
  const value = body[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new RouteInputError(`Expected non-empty string body field: ${key}`);
  }

  return value;
}

export function requiredObject<T extends JsonObject>(
  body: JsonObject,
  key: string,
): T {
  const value = body[key];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RouteInputError(`Expected object body field: ${key}`);
  }

  return value as T;
}
