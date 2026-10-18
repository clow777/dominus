import Link from "next/link";

import type { RankingEntry, RankingResponse } from "@/lib/dash-types";
import { brl, rank } from "@/lib/format";
import { DpCard, KebabMenu } from "./card";

const glowText = "[text-shadow:0_0_10px_var(--dp-glow)]";

function Avatar({ entry }: { entry: RankingEntry }) {
  return entry.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- avatar público de origem externa
    <img src={entry.avatarUrl} alt="" className="size-[30px] rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-full border border-dp-primary text-xs font-bold text-dp-primary">
      {entry.nome.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function TopPlayers({ data, onRefresh }: { data: RankingResponse; onRefresh: () => void }) {
  const best = data.top[0]?.valor ?? 0;
  return (
    <DpCard>
      <span aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/2 h-24 w-40 -translate-x-1/2 rounded-full bg-dp-primary opacity-20 blur-[40px]" />
      <div className="relative flex items-start justify-between">
        <div>
          <h2 className="text-[13px] font-extrabold tracking-wide text-white uppercase">TOP 5 MELHORES PLAYERS</h2>
          <p className="mt-0.5 font-jb text-[9px] text-dp-dim">MÊS</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/ranking" className="font-jb text-[9px] text-dp-muted hover:text-white">
            VER TODOS →
          </Link>
          <KebabMenu label="Opções do ranking" items={[{ label: "Atualizar", onSelect: onRefresh }]} />
        </div>
      </div>

      {data.top.length === 0 ? (
        <p className="relative py-8 text-center font-jb text-[10px] text-dp-dim">Sem vendas confirmadas no mês.</p>
      ) : (
        <ol className="relative mt-4 grid gap-3">
          {data.top.map((p) => (
            <li key={p.posicao} className="relative pl-3">
              <span aria-hidden="true" className="absolute top-0 bottom-2 left-0 w-[3px] rounded-full bg-dp-primary shadow-[0_0_10px_var(--dp-glow)]" />
              <div className="flex items-center gap-2.5">
                <Avatar entry={p} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-white uppercase">{p.nome}</p>
                  <p className="font-jb text-[8px] text-dp-dim">
                    {rank(p.posicao)}
                    {p.tier ? (
                      <>
                        {" · "}
                        <span className="text-dp-primary">{p.tier}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`font-jb text-[11px] font-bold text-dp-primary ${glowText}`}>{brl(p.valor)}</span>
                  {p.posicao === 1 ? <span aria-hidden="true" className="size-1 rounded-full bg-dp-primary" /> : null}
                </div>
              </div>
              <div className="mt-2 h-0.5 rounded-full bg-dp-divider" role="presentation">
                <div className="h-full rounded-full bg-dp-primary" style={{ width: `${best > 0 ? (p.valor / best) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="relative mt-4 border-t border-dp-divider pt-3">
        <div className="relative flex items-center gap-2.5 rounded-lg border border-dp-primary/30 bg-(--dp-soft) py-2 pr-3 pl-3">
          <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-[3px] rounded-full bg-dp-primary shadow-[0_0_10px_var(--dp-glow)]" />
          <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-full border border-dp-primary text-xs font-bold text-dp-primary ring-2 ring-dp-primary/30">
            {data.voce.nome.trim().charAt(0).toUpperCase() || "V"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white">VOCÊ</p>
            <p className="font-jb text-[8px] text-dp-dim">
              {rank(data.voce.posicao)} · <span className="text-dp-primary">{data.voce.tier}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`font-jb text-[11px] font-bold text-dp-primary ${glowText}`}>{brl(data.voce.valor)}</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-dp-primary" />
          </div>
        </div>
      </div>
    </DpCard>
  );
}
