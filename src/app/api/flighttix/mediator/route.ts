import { getMediatorInfo } from "@/server/identus/mediator";
import { respond } from "../_lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return respond(() => getMediatorInfo());
}
