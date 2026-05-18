// Navigate to inbox first, then select and archive matching emails
async function archiveFromInbox(page, matchStr) {
  const selected = await page.evaluate((matchStr) => {
    const rows = document.querySelectorAll('tr.zA');
    let count = 0;
    for (const row of rows) {
      const senderEl = row.querySelector('.yW .yP, .yW .zF');
      const email = senderEl ? senderEl.getAttribute('email') || '' : '';
      if (email.includes(matchStr)) {
        const checkbox = row.querySelector('[role="checkbox"]');
        if (checkbox) { checkbox.click(); count++; }
      }
    }
    return count;
  }, matchStr);

  if (selected > 0) {
    await page.locator('[aria-label="Archive"]').first().evaluate(el => el.click());
    await page.waitForTimeout(2000);
  }
  return selected;
}
