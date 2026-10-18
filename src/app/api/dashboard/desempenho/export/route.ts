import { dayLabel } from "@/lib/format";
import { dashRoute } from "@/server/dash/route";
import { getDesempenho } from "@/server/dash/metrics";

export const dynamic = "force-dynamic";

const reais = (cents: number) => (cents / 100).toFixed(2);

export const GET = (request: Request) =>
  dashRoute(request, async ({ orgId, period }) => {
    const { serie } = await getDesempenho(orgId, period);
    const lines = ["data;starts;vendas_geradas;vendas_pagas", ...serie.map((p) => `${dayLabel(p.data)};${p.starts};${reais(p.vendasGeradas)};${reais(p.vendasPagas)}`)];
    return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dominuspay-desempenho-${period}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
