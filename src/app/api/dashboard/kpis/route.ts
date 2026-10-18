import { dashRoute } from "@/server/dash/route";
import { getKpis } from "@/server/dash/metrics";

export const dynamic = "force-dynamic";

export const GET = (request: Request) => dashRoute(request, ({ orgId, period }) => getKpis(orgId, period));
