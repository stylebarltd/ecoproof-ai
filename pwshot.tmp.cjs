const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1117/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 402, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(String(e))); page.on("console", m => { if (m.type()==="error") errs.push(m.text().slice(0,160)); });
  await page.goto("https://ecoproof-ai.vercel.app/", { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/claude-1000/-home-pola-Development-EcoProofAi/aa6765ce-3c72-45ca-b613-da7cecdc505d/scratchpad/m-home.png" });
  await page.goto("https://ecoproof-ai.vercel.app/map", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/claude-1000/-home-pola-Development-EcoProofAi/aa6765ce-3c72-45ca-b613-da7cecdc505d/scratchpad/m-map.png" });
  console.log("console/page errors:", JSON.stringify(errs));
  await b.close();
})();
