import {
  type CredentialKind,
  createPassportOfferRequest,
  createTicketOfferRequest,
  type PassportClaims,
  type TicketClaims,
} from "@/lib/flighttix/domain";
import { cloudAgentClient } from "@/server/identus/cloud-agent";
import { getFlightTixConfig } from "@/server/identus/config";
import {
  RouteInputError,
  readJsonObject,
  requiredObject,
  requiredString,
  respond,
} from "../../_lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return respond(async () => {
    const body = await readJsonObject(request);
    const kind = requiredString(body, "kind") as CredentialKind;
    const input = {
      connectionId: requiredString(body, "connectionId"),
      issuingDID: requiredString(body, "issuingDID"),
      schemaGuid: requiredString(body, "schemaGuid"),
      cloudAgentSchemaBaseUrl: getFlightTixConfig().cloudAgentSchemaBaseUrl,
    };

    if (kind === "passport") {
      const claims = requiredObject<PassportClaims>(body, "claims");
      return cloudAgentClient().createCredentialOffer(
        createPassportOfferRequest({ ...input, claims }),
      );
    }

    if (kind === "ticket") {
      const claims = requiredObject<TicketClaims>(body, "claims");
      return cloudAgentClient().createCredentialOffer(
        createTicketOfferRequest({ ...input, claims }),
      );
    }

    throw new RouteInputError("Expected kind to be passport or ticket");
  });
}
