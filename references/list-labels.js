// Navigate to https://mail.google.com/mail/u/0/#settings/labels first
const labels = await page.locator('td.alT div.Zsjd8d div.alC').allTextContents();
