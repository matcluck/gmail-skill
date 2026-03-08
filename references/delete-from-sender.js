async function deleteAllFromSender(page, senderEmail) {
  await page.goto(`https://mail.google.com/mail/u/0/#search/from:${senderEmail}`);
  await page.waitForTimeout(3000);

  await page.getByRole('button', { name: 'Select', exact: true }).click();
  await page.waitForTimeout(1000);

  // If more than one page, click "Select all conversations that match this search"
  const selectAllLink = page.locator('span.ar5.ev').filter({ hasText: 'Select all conversations that match this search' });
  if (await selectAllLink.count() > 0) {
    await selectAllLink.click();
    await page.waitForTimeout(1000);
  }

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(2000);
}
