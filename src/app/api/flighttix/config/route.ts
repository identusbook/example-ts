import { getPublicFlightTixConfig } from "@/server/identus/config";
import { respond } from "../_lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return respond(() => getPublicFlightTixConfig());
}
