const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1117/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 402, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  const reqs = []; page.on("requestfinished", async r => { if (r.url().includes("/api/receipts")) { const rs = await r.response(); reqs.push(rs.status()+" "+(r.postDataBuffer()?.length||0)+"B"); } });
  await page.goto("https://ecoproof-ai.vercel.app/", { waitUntil: "networkidle" });
  await page.setInputFiles("input[type=file]", "/tmp/claude-1000/-home-pola-Development-EcoProofAi/aa6765ce-3c72-45ca-b613-da7cecdc505d/scratchpad/huge.jpg");
  await page.waitForSelector("text=Open share card, text=already been claimed, text=couldn", { timeout: 90000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  const body = await page.innerText("body");
  console.log("UPLOAD (14MB file):", /Anchored on Solana/.test(body) ? "OK anchored" : "NO RESULT", "| request:", JSON.stringify(reqs), "| claimed-line:", /Receipt claimed on Solana/.test(body));
  console.log(body.split("\n").filter(l=>/Green Market|kg CO|x |×/.test(l)).slice(0,6).join(" || "));
  await page.screenshot({ path: "/tmp/claude-1000/-home-pola-Development-EcoProofAi/aa6765ce-3c72-45ca-b613-da7cecdc505d/scratchpad/m-result.png", fullPage: true });
  // map interaction
  await page.goto("https://ecoproof-ai.vercel.app/map", { waitUntil: "networkidle" });
  await page.click("text=SuperBee shops"); await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/claude-1000/-home-pola-Development-EcoProofAi/aa6765ce-3c72-45ca-b613-da7cecdc505d/scratchpad/m-bee.png" });
  const n = await page.evaluate(() => document.querySelectorAll("path.leaflet-interactive").length);
  await page.evaluate(() => document.querySelector("path.leaflet-interactive").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/claude-1000/-home-pola-Development-EcoProofAi/aa6765ce-3c72-45ca-b613-da7cecdc505d/scratchpad/m-sheet.png" });
  console.log("markers with SuperBee filter:", n, "| page errors:", JSON.stringify(errs));
  await b.close();
})();
