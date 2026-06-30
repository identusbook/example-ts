import { flightCatalog } from "@/lib/flighttix/domain";
import { respond } from "../_lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return respond(() => flightCatalog);
}
