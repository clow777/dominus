import { describe, expect, it } from "vitest";

import { isHttpUrl, parseWaitMinutes, renderText, retryDelayMs } from "@/lib/flow-steps";

describe("flow-steps", () => {
  it("substitui {nome} e limpa espaços", () => {
    expect(renderText("Olá, {nome}! Bem-vindo.", { nome: "Ana" })).toBe("Olá, Ana! Bem-vindo.");
    expect(renderText("Olá {nome}!", { nome: null })).toBe("Olá !");
    expect(renderText("Oi {outro}", { nome: "Ana" })).toBe("Oi {outro}");
  });

  it("limita o tempo de espera", () => {
    expect(parseWaitMinutes(undefined)).toBe(30);
    expect(parseWaitMinutes("abc")).toBe(30);
    expect(parseWaitMinutes("-5")).toBe(30);
    expect(parseWaitMinutes("15")).toBe(15);
    expect(parseWaitMinutes("999999")).toBe(1440);
  });

  it("reconhece só links http(s)", () => {
    expect(isHttpUrl("https://exemplo.com/x")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("texto livre")).toBe(false);
  });

  it("aumenta o intervalo entre tentativas", () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(3)).toBe(90_000);
  });
});
