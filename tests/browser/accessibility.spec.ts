import "./environment";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { customerSessions, customers, visitorSessions } from "../../src/server/db/schema";
import { createVisitor, VISITOR_SECONDS } from "../../src/server/services/visitor-session";
import { tokenHash } from "../../src/server/services/admin-auth";
import { TEST_ORIGIN } from "./environment";

test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => new URL(route.request().url()).origin === TEST_ORIGIN ? route.continue() : route.abort());
});
async function adminSession(page: import("@playwright/test").Page) {
  const visitor = await createVisitor();
  const [admin] = await db.insert(customers).values({ username: `a11y_${randomUUID().slice(0, 8)}`, passwordHash: "fixture-not-used", role: "admin" }).returning();
  const token = randomBytes(32).toString("hex");
  await db.update(visitorSessions).set({ customerId: admin.id }).where(eq(visitorSessions.id, visitor.id));
  await db.insert(customerSessions).values({ tokenHash: tokenHash(token), customerId: admin.id, visitorId: visitor.id, expiresAt: new Date(Date.now() + VISITOR_SECONDS * 1000) });
  await page.context().addCookies([{ name: "travelmind_visitor", value: visitor.token, url: TEST_ORIGIN }, { name: "travelmind_customer", value: token, url: TEST_ORIGIN }]);
}

test("pantallas públicas pasan reglas automáticas WCAG 2.2 AA", async ({ page }) => {
  for (const path of ["/", "/packages", "/chat", "/account"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    if (path === "/chat") await expect(page.getByLabel("¿Qué te gustaría conocer?", { exact: true })).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    if (result.violations.length) console.log(JSON.stringify({ path, findings: result.violations.map(item => ({ id: item.id, first: item.nodes[0]?.failureSummary, data: item.nodes[0]?.any.map(check => check.data) })) }));
    expect(result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })), path).toEqual([]);
    await page.setViewportSize({ width: 320, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true);
    const mobile = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    if (mobile.violations.length) console.log(JSON.stringify({ path, mobile: true, findings: mobile.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary, data: node.any.map(check => check.data) })) })) }));
    expect(mobile.violations.map(item => item.id), `${path} 320px`).toEqual([]);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
});

test("cuenta, tablas y paneles de personal pasan reglas automáticas y navegación básica de teclado", async ({ page }) => {
  await adminSession(page);
  for (const path of ["/account/operations", "/account/cases", "/account/notifications", "/account/catalog", "/account/approvals", "/reservations"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    if (path === "/account/operations") await expect(page.getByRole("heading", { name: "Indicadores de los últimos siete días" })).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    if (result.violations.length) console.log(JSON.stringify({ path, findings: result.violations.map(item => ({ id: item.id, first: item.nodes[0]?.failureSummary })) }));
    expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), path).toEqual([]);
    await page.setViewportSize({ width: 320, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true);
    const mobile = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(mobile.violations.map(item => item.id), `${path} 320px`).toEqual([]);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.goto("/account/operations");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).toMatch(/A|BUTTON/);
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle !== "none" || getComputedStyle(document.activeElement!).boxShadow !== "none")).toBe(true);
});
