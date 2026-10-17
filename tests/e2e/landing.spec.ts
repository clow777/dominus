import { expect, test, type Page } from "@playwright/test";

const STOPS = ["inicio", "pagamentos", "produto", "seguranca", "desenvolvedores", "comecar"];

async function scrollToSection(page: Page, id: string) {
  await page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId)!;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3, behavior: "instant" });
  }, id);
  await page.waitForTimeout(150);
}

test.describe("landing page", () => {
  test("mostra a proposta e os CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Cada movimento conta." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Começar agora" }).first()).toHaveAttribute("href", "/criar-conta");
    await expect(page.getByRole("link", { name: "Conhecer a plataforma" })).toHaveAttribute("href", "#produto");
  });

  test("tem todas as seções da jornada, na ordem", async ({ page }) => {
    await page.goto("/");
    const tops = await page.evaluate(
      (ids) => ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? Number.NaN),
      STOPS,
    );
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeGreaterThan(tops[i - 1]!);
  });

  test("não rola na horizontal", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("envia cabeçalhos de segurança", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("páginas legais existem e avisam que são minuta", async ({ page }) => {
    for (const path of ["/termos", "/privacidade", "/cookies"]) {
      await page.goto(path);
      await expect(page.getByRole("note")).toContainText("Minuta em revisão jurídica");
    }
  });

  test("SEO técnico", async ({ request }) => {
    expect((await request.get("/robots.txt")).ok()).toBe(true);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/privacidade");
    expect((await request.get("/opengraph-image")).headers()["content-type"]).toContain("image/png");
  });
});

test.describe("peão — desktop", () => {
  test.skip(({ isMobile }) => isMobile, "trajetória completa só no desktop");

  test("avança uma casa por seção, até a promoção", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator('[data-stage-mode="journey"]');
    await expect(stage).toHaveAttribute("data-stop", "0");
    for (let i = 1; i < STOPS.length; i++) {
      await scrollToSection(page, STOPS[i]!);
      await expect(stage).toHaveAttribute("data-stop", String(i));
    }
  });

  test("o palco nunca cobre o conteúdo", async ({ page }) => {
    await page.goto("/");
    const main = await page.locator("main#conteudo").boundingBox();
    const aside = await page.locator("aside").boundingBox();
    expect(main && aside).toBeTruthy();
    expect(main!.x + main!.width).toBeLessThanOrEqual(aside!.x + 1);
  });

  test("respeita prefers-reduced-motion: sem movimento intermediário", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const stage = page.locator('[data-stage-mode="journey"]');
    for (let y = 0; y < 6000; y += 300) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      await page.waitForTimeout(40);
      await expect(stage).toHaveAttribute("data-moving", "false");
    }
  });
});

test.describe("peão — mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "somente mobile");

  test("usa a cena do hero e a trilha no cabeçalho", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-stage-mode="hero"]')).toBeVisible();
    await expect(page.locator('[data-stage-mode="journey"]')).toHaveCount(0);
    await expect(page.locator("aside")).toBeHidden();
  });

  test("menu abre, fecha com Esc e mantém foco acessível", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Abrir menu" });
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Principal (mobile)" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Principal (mobile)" })).toBeHidden();
  });
});
