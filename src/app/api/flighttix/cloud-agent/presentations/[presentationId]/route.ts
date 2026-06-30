import { cloudAgentClient } from "@/server/identus/cloud-agent";
import { readJsonObject, respond } from "../../../_lib/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ presentationId: string }> },
) {
  return respond(async () => {
    const { presentationId } = await context.params;
    return cloudAgentClient().getPresentation(presentationId);
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ presentationId: string }> },
) {
  return respond(async () => {
    const body = await readJsonObject(request);
    const { presentationId } = await context.params;
    return cloudAgentClient().updatePresentation(presentationId, body);
  });
}
