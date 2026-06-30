import { createProofRequest } from "@/lib/flighttix/domain";
import { cloudAgentClient } from "@/server/identus/cloud-agent";
import { getFlightTixConfig } from "@/server/identus/config";
import { readJsonObject, requiredString, respond } from "../../_lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return respond(() => cloudAgentClient().getPresentations());
}

export async function POST(request: Request) {
  return respond(async () => {
    const body = await readJsonObject(request);
    return cloudAgentClient().createPresentation(
      createProofRequest({
        connectionId: requiredString(body, "connectionId"),
        issuerDID: requiredString(body, "issuerDID"),
        schemaGuid: requiredString(body, "schemaGuid"),
        cloudAgentSchemaBaseUrl: getFlightTixConfig().cloudAgentSchemaBaseUrl,
      }),
    );
  });
}
