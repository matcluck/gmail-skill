// Emails must already be selected in the inbox/search view
async function removeLabelFromSelected(page, labelName) {
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.waitForTimeout(1000);

  const checkbox = page.getByRole('menuitemcheckbox', { name: labelName, exact: true });
  await checkbox.click(); // Unchecks the label
  await page.waitForTimeout(500);
  // Apply is automatic after clicking — dropdown closes
}
