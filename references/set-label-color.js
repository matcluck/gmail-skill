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
  const lcItem = page.locator('[role="menuitem"]').filter({ hasText: 'Label color' }).first();
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
