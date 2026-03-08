// Navigate to https://mail.google.com/mail/u/0/#settings/labels first
//
// Gmail stores nesting two ways: a `/` in the label name AND/OR the "Nest label under"
// checkbox. When a label is wrongly nested, the fix is to uncheck "Nest label under" —
// the `/` in the name handles the correct hierarchy.

async function unnestLabel(page, displayName) {
  const labelDiv = page.locator('td.alT div.Zsjd8d').filter({
    hasText: new RegExp(`^${displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
  });
  const row = labelDiv.locator('xpath=ancestor::tr');
  const editSpan = row.locator('span.alP').filter({ hasText: /^edit$/ });
  await editSpan.scrollIntoViewIfNeeded({ timeout: 10000 });
  await editSpan.click({ force: true, timeout: 10000 });

  await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });

  const nestCheckbox = page.getByRole('checkbox', { name: 'Nest label under:' });
  if (await nestCheckbox.isChecked()) {
    await nestCheckbox.click();
  }

  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(2000);
}

// To re-nest under a specific parent:
// The combobox is a custom div, NOT a native <select>. Do NOT use selectOption().
async function nestLabelUnder(page, displayName, parentName) {
  // ... same edit click pattern as unnestLabel above ...
  const nestCheckbox = page.getByRole('checkbox', { name: 'Nest label under:' });
  if (!(await nestCheckbox.isChecked())) {
    await nestCheckbox.click();
  }
  const combo = page.getByRole('combobox', { name: 'Nest label under:' });
  await combo.click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: parentName, exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(2000);
}
