// Navigate to https://mail.google.com/mail/u/0/#settings/filters first
//
// Filter action checkbox indices: 0=Skip Inbox, 1=Mark read, 2=Star, 3=Apply label
// The label dropdown is a custom div[role="listbox"] — open with mousedown/mouseup events
// The "Also apply filter" checkbox is always the last .btj checkbox

async function createFilter(page, from, subject, labelTitle) {
  // Step 1: Open filter creation form
  const createLink = page.getByRole('link', { name: 'Create a new filter' });
  await createLink.evaluate(el => el.click());
  await page.waitForTimeout(1000);

  // Step 2: Fill criteria
  await page.getByRole('textbox', { name: 'From' }).fill(from);
  if (subject) {
    await page.getByRole('textbox', { name: 'Subject' }).fill(subject);
  }

  // Step 3: Move to actions page
  const createFilterBtn = page.getByRole('button', { name: 'Create filter' });
  await createFilterBtn.evaluate(el => el.click());
  await page.waitForTimeout(2000);

  // Step 4: Check "Skip Inbox" and "Apply label" via JS (viewport issues)
  await page.evaluate(() => {
    const cbs = document.querySelectorAll('input.btj[type="checkbox"]');
    if (!cbs[0].checked) cbs[0].click(); // Skip Inbox
    if (!cbs[3].checked) cbs[3].click(); // Apply label
  });
  await page.waitForTimeout(300);

  // Step 5: Open custom label dropdown (Gmail uses .J-M popup menus)
  const listbox = page.locator('[aria-expanded]').filter({ hasText: 'Choose label' }).first();
  await listbox.evaluate(el => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.waitForTimeout(500);

  // Step 6: Select label — use [role="option"] to avoid ambiguity with sidebar
  const menuItem = page.locator(`[role="option"][title="${labelTitle}"]`);
  await menuItem.evaluate(el => {
    let parent = el.parentElement;
    while (parent && parent.scrollHeight <= parent.clientHeight) parent = parent.parentElement;
    if (parent) el.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(300);
  await menuItem.click({ force: true });
  await page.waitForTimeout(500);

  // Step 7: Check "Also apply filter to matching conversations"
  await page.evaluate(() => {
    const cbs = document.querySelectorAll('input.btj[type="checkbox"]');
    cbs[cbs.length - 1].click(); // Last checkbox
  });
  await page.waitForTimeout(300);

  // Step 8: Submit
  const finalBtn = page.getByRole('button', { name: 'Create filter' });
  await finalBtn.evaluate(el => el.click());
  await page.waitForTimeout(3000);
}
