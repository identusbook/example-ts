import { cloudAgentClient } from "@/server/identus/cloud-agent";
import { respond } from "../../_lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return respond(() => cloudAgentClient().getConnections());
}

export async function POST() {
  return respond(() => cloudAgentClient().createConnection());
}
