// Navigate to inbox first. The label sidebar has hidden menu buttons that appear on hover.
//
// GOTCHAS:
// - div.pM has aria-hidden="true" and zero size — scroll the parent .TN via page.evaluate()
// - CSS.escape() is NOT available in Playwright's Node context — use XPath selectors
// - JS .click() doesn't trigger Gmail's jsaction system — must use Playwright's hover()+click()
// - "Label color" is a submenu — HOVER to open it, don't click
// - Color gridcells have accessible names like "RGB (251, 76, 47)" — visible text is just "a"
// - Parent labels with children trigger a dialog — use page.getByRole('radio', ...) at page level
//
// Gmail preset colors (24 total, 4x6 grid):
// Row 1: (251,76,47)  (255,117,55) (255,173,70) (251,233,131) (66,214,146)  (22,167,101)
// Row 2: (179,239,211)(162,220,193)(152,215,228)(45,162,187)  (73,134,231)  (182,207,245)
// Row 3: (185,154,255)(227,215,255)(246,145,178)(251,211,224) (242,178,168) (255,200,175)
// Row 4: (255,222,181)(235,219,222)(204,166,172)(194,194,194) (231,231,231) (253,237,193)

async function setLabelColor(page, labelName, rgb) {
  // Step 1: Scroll label into view
  await page.evaluate((name) => {
    const btns = document.querySelectorAll('div.pM');
    for (const btn of btns) {
      if (btn.getAttribute('data-label-name') === name) {
        btn.closest('.TN').scrollIntoView({ block: 'center' });
        break;
      }
    }
  }, labelName);
  await page.waitForTimeout(300);

  // Step 2: Hover the TN row to reveal menu button (use xpath for data-label-name)
  const menuBtn = page.locator(`//div[contains(@class,"pM")][@data-label-name="${labelName}"]`);
  const tnDiv = menuBtn.locator('xpath=ancestor::div[contains(@class,"TN")][1]').first();
  await tnDiv.hover({ force: true, timeout: 3000 });
  await page.waitForTimeout(300);

  // Step 3: Click menu button
  await menuBtn.click({ force: true, timeout: 3000 });
  await page.waitForTimeout(500);

  // Step 4: HOVER "Label color" (it's a submenu — must hover, NOT click)
  const lcItem = page.locator(`xpath=//div[@role="menuitem" and contains(., "Label color")]`).last();
  await lcItem.hover({ force: true, timeout: 3000 });
  await page.waitForTimeout(500);

  // Step 5: Click color cell
  const cell = page.getByRole('gridcell', { name: `RGB (${rgb})` }).first();
  await cell.click({ force: true, timeout: 3000 });
  await page.waitForTimeout(800);

  // Step 6: Handle sublabels dialog (appears for parent labels with children)
  const dialog = page.locator('[role="alertdialog"]');
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('radio', { name: `Label "${labelName}" and its` }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Set color' }).click();
    await page.waitForTimeout(800);
  }
}

// Fast batch path for Codex sessions where Playwright MCP lacks a one-call
// code runner but Chromium is available on a remote debugging port.
//
// Usage:
//   1. Start Chromium with --remote-debugging-port=9222 using the normal profile.
//   2. Run:
//      npx -y -p playwright node - <<'NODE'
//      const { chromium } = require('playwright');
//      const { setLabelColorsOverCDP } = require('/abs/path/to/set-label-color.js');
//      (async () => {
//        const result = await setLabelColorsOverCDP({
//          cdpUrl: 'http://127.0.0.1:9222',
//          updates: [
//            { labelName: 'Security', rgb: '251, 76, 47' },
//            { labelName: 'Finance/Example Bank', rgb: '22, 167, 101' },
//          ],
//        });
//        console.log(JSON.stringify(result, null, 2));
//      })().catch(err => { console.error(err); process.exit(1); });
//      NODE
//
// This keeps the whole colour pass to one shell command after browser setup.
async function setLabelColorsOverCDP({ cdpUrl = 'http://127.0.0.1:9222', updates, chromium: injectedChromium }) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error('updates must be a non-empty array');
  }

  const chromium = injectedChromium || require('playwright').chromium;
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  const existingPage = context.pages().find(p => p.url().includes('mail.google.com'));
  const page = existingPage || await context.newPage();

  try {
    await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.locator('div.pM[data-label-name]').first().waitFor({ state: 'attached', timeout: 15000 });

    const results = [];
    for (const { labelName, rgb } of updates) {
      await setLabelColor(page, labelName, rgb);
      const applied = await page.evaluate((name) => {
        const node = [...document.querySelectorAll('div.pM[data-label-name]')]
          .find(el => el.getAttribute('data-label-name') === name);
        if (!node) return null;
        const colorNode = node.closest('.TN')?.querySelector('[style*="background-color"]');
        return colorNode ? getComputedStyle(colorNode).backgroundColor : null;
      }, labelName);
      results.push({ labelName, rgb, applied });
    }

    return { ok: true, results };
  } finally {
    await browser.close();
  }
}

module.exports = { setLabelColor, setLabelColorsOverCDP };
