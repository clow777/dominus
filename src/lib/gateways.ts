export type GatewayStatus = "inactive" | "configured" | "active";

export interface ThirdPartyGateway {
  key: string;
  name: string;
}

/** Catálogo de gateways de terceiros. A API key é guardada cifrada; a integração real não está habilitada. */
export const THIRD_PARTY_GATEWAYS: readonly ThirdPartyGateway[] = [
  { key: "atenas_pay", name: "Atenas Pay" },
  { key: "atomo_pay", name: "AtomoPay" },
  { key: "blackcat_pay", name: "BlackCat Pay" },
  { key: "cifra", name: "Cifra" },
  { key: "duckfy", name: "Duckfy" },
  { key: "gotham_pay", name: "GothamPay" },
  { key: "iron_pay", name: "IronPay" },
  { key: "jumpfy", name: "Jumpfy" },
  { key: "mercado_pago", name: "Mercado Pago" },
  { key: "mistic_pay", name: "MisticPay" },
];

export const THIRD_PARTY_KEYS = THIRD_PARTY_GATEWAYS.map((g) => g.key);

/** Taxa por transação e saldo mínimo para saque do gateway Dominus, em centavos. */
export const WALLET_FEE_CENTS = 100;
export const WALLET_MIN_BALANCE_CENTS = 1200;

export const SANDBOX_KEY = "dominus_test";
