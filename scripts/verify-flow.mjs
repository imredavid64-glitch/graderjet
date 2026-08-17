import { chromium } from "playwright";

// Default: local mock server. For a deployed site with a real model:
//   BASE_URL=https://graderjet.vercel.app REAL_MODEL=1 node scripts/verify-flow.mjs
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const REAL_MODEL = process.env.REAL_MODEL === "1" || process.env.MODE === "real";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("favicon"))
    errors.push("console.error: " + m.text());
});

const checks = [];
function check(name, ok) {
  checks.push([name, ok]);
  console.log((ok ? "PASS" : "FAIL") + ": " + name);
}

// Known phrases from the scripted mock agent — a real model reply must not
// contain any of them.
const MOCK_FRAGMENTS = [
  "The workspace is synced",
  "Re-reading the introduction",
  "Understood. A curve shifts",
  "The evidence deductions come from a couple of claims",
  "Noted. Reviewing the current paper",
  "Sure — here's the passage behind that flag",
];

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector("text=Agent Dialogue");

check("brand renders", (await page.locator("text=GraderJet").count()) > 0);
check("document viewer shows student", (await page.locator("text=Alex Rivera").count()) > 0);
check("opening agent message present", (await page.locator("text=applied an initial assessment").count()) > 0);

if (REAL_MODEL) {
  // --- Real-model flow (deployed site with OPENROUTER_API_KEY etc.) ---
  // Replies are non-deterministic, so assert on behavior rather than script:
  // a streamed reply that is not the mock script, and no fail-loud banners.
  await page.locator("text=Raise Thesis to 20 and explain why").click();

  // Stream must start (composer flips to the Stop button)...
  await page.waitForSelector('button[aria-label="Stop"]', { timeout: 30000 });
  // ...and finish (Send button returns when the agent is idle).
  await page.waitForSelector('button[aria-label="Send"]', { timeout: 120000 });

  const body = await page.locator("body").innerText();
  check(
    "no API-key rejection banner",
    !body.includes("OPENROUTER_API_KEY is set but") &&
      !body.includes("rejected it (HTTP") &&
      !body.includes("requires more credits"),
  );

  const reply = (await page.locator("p.whitespace-pre-wrap").last().innerText()).trim();
  check("agent replied with text", reply.length > 0);
  check("reply is NOT the mock script", !MOCK_FRAGMENTS.some((f) => reply.includes(f)));
  console.log("  reply: " + JSON.stringify(reply.slice(0, 160)));

  // Tool calls are model-dependent — report, don't fail.
  const toolCards = ["Update score", "Highlight passage", "Apply curve"].filter((t) =>
    body.includes(t),
  ).length;
  console.log(
    "  tool cards rendered: " +
      toolCards +
      (toolCards ? "" : " (model chose not to call a tool)"),
  );
} else {
  // --- Mock flow (deterministic scripted agent, local server) ---

  // Interaction 1: raise thesis via suggested prompt
  await page.locator("text=Raise Thesis to 20 and explain why").click();
  await page.waitForSelector("text=Update score · Thesis → 20", { timeout: 15000 });
  check("chat renders update_scores tool card", true);

  await page.waitForSelector("text=Highlight passage · ¶1", { timeout: 15000 });
  check("chat renders highlight_passage tool card", true);

  await page.waitForSelector("text=The workspace is synced", { timeout: 15000 });
  check("agent acknowledged after tool round (no loop)", true);

  // Activity feed recorded both actions
  const body = await page.locator("body").innerText();
  check("activity feed shows score change", body.includes("Score updated · Thesis"));
  check("activity feed shows highlight", body.includes("Highlight · ¶1"));

  // Document viewer should now show the new "Thesis (revised)" flag
  check("document shows new 'Thesis (revised)' flag", body.includes("Thesis (revised)"));

  // Scorecard should reflect Thesis = 20 (total 80 -> 84)
  await page.locator("text=Scorecard").first().click();
  await page.waitForSelector("text=Overall score", { timeout: 5000 });
  const scoreText = await page.locator("body").innerText();
  check("scorecard total updated to 84", /84\s*\/\s*100/.test(scoreText));

  // Interaction 2: curve the batch
  await page.locator("text=Agent Dialogue").first().click();
  await page.locator("text=Apply a +2 curve to the batch").click();
  await page.waitForSelector("text=Apply curve +2", { timeout: 15000 });
  check("chat renders apply_batch_curve tool card", true);
  await page.waitForSelector("text=+2 curve", { timeout: 15000 });
  check("top nav shows +2 curve badge", true);
}

if (errors.length) {
  console.log("\nBrowser errors captured:");
  errors.forEach((e) => console.log("  " + e));
} else {
  console.log("\nNo unexpected browser console/page errors.");
}

await page.screenshot({ path: "/tmp/graderjet-final.png" });

const failed = checks.filter(([, ok]) => !ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
