export interface Triple {
  atual: number;
  d7: number;
  d30: number;
}

export interface KpisResponse {
  starts: Triple;
  receitaGerada: Triple;
  receitaConfirmada: Triple;
  conversao: Triple & { semDados: boolean };
}

export interface SeriePoint {
  data: string;
  starts: number;
  vendasGeradas: number;
  vendasPagas: number;
}

export interface DesempenhoResponse {
  serie: SeriePoint[];
  totais: { starts: number; vendasGeradas: number; vendasPagas: number };
}

export interface RankingEntry {
  posicao: number;
  nome: string;
  avatarUrl: string | null;
  valor: number;
}

export interface RankingResponse {
  top: (RankingEntry & { tier: "ALPHA" | null })[];
  voce: RankingEntry & { tier: "OPERADOR REGISTRADO" };
}

export interface MetricaMes {
  valor: number;
  variacao: number;
}

export interface MetricasMesResponse {
  conversao: MetricaMes;
  ticketMedio: MetricaMes;
  totalVendas: MetricaMes;
}
