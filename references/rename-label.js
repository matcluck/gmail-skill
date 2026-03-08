// Navigate to https://mail.google.com/mail/u/0/#settings/labels first
async function renameLabel(page, currentName, newName) {
  const labelDiv = page.locator('td.alT div.Zsjd8d').filter({
    hasText: new RegExp(`^${currentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
  });
  const row = labelDiv.locator('xpath=ancestor::tr');
  const editSpan = row.locator('span.alP').filter({ hasText: /^edit$/ });
  await editSpan.scrollIntoViewIfNeeded({ timeout: 10000 });
  await editSpan.click({ timeout: 10000 });

  await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  const input = page.getByRole('textbox', { name: 'Label name:' });
  await input.fill(newName);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(2000);
}
