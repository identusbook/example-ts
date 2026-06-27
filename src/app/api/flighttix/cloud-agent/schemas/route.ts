import {
  type CredentialKind,
  createPassportSchema,
  createTicketSchema,
} from "@/lib/flighttix/domain";
import { cloudAgentClient } from "@/server/identus/cloud-agent";
import { getFlightTixConfig } from "@/server/identus/config";
import {
  RouteInputError,
  readJsonObject,
  requiredString,
  respond,
} from "../../_lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return respond(() => {
    const guid = new URL(request.url).searchParams.get("guid");

    if (!guid) {
      throw new RouteInputError("Expected guid query parameter");
    }

    return cloudAgentClient().getSchema(guid);
  });
}

export async function POST(request: Request) {
  return respond(async () => {
    const body = await readJsonObject(request);
    const author = requiredString(body, "author");
    const kind = requiredString(body, "kind") as CredentialKind;
    const config = getFlightTixConfig();

    if (kind === "passport") {
      return cloudAgentClient().createSchema(
        createPassportSchema(author, config.passportStableSchemaId),
      );
    }

    if (kind === "ticket") {
      return cloudAgentClient().createSchema(
        createTicketSchema(author, config.ticketStableSchemaId),
      );
    }

    throw new RouteInputError("Expected kind to be passport or ticket");
  });
}
