import { dashRoute } from "@/server/dash/route";
import { getDesempenho } from "@/server/dash/metrics";

export const dynamic = "force-dynamic";

export const GET = (request: Request) => dashRoute(request, ({ orgId, period }) => getDesempenho(orgId, period));
