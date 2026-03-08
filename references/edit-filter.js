// Navigate to https://mail.google.com/mail/u/0/#settings/filters first
// Filter edit/delete links are <span class="sA" role="link"> (NOT <a> tags)
async function editFilter(page, matchText, updateFromFn) {
  await page.evaluate((match) => {
    const tds = document.querySelectorAll('td');
    for (const td of tds) {
      if (td.textContent.includes(match)) {
        const row = td.closest('tr');
        if (row) {
          const editLink = row.querySelector('span.sA[role="link"]');
          if (editLink) { editLink.click(); break; }
        }
      }
    }
  }, matchText);
  await page.waitForTimeout(2000);

  const fromInput = page.getByRole('textbox', { name: 'From' });
  const currentValue = await fromInput.inputValue();
  await fromInput.fill(updateFromFn(currentValue));

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(2000);

  // Click Update filter (NOT "Create filter")
  await page.getByRole('button', { name: 'Update filter' }).evaluate(el => el.click());
  await page.waitForTimeout(3000);
}
