import { cloudAgentClient } from "@/server/identus/cloud-agent";
import { respond } from "../../../../_lib/http";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ didRef: string }> },
) {
  return respond(async () => {
    const { didRef } = await context.params;
    return cloudAgentClient().publishDid(didRef);
  });
}
