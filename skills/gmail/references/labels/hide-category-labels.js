// Navigate to https://mail.google.com/mail/u/0/#settings/labels first
// Category labels use div.al6 for names and span.alP for "hide" action (NOT <a> tags)

async function hideCategoryLabels(page, targets) {
  // targets = ['Purchases', 'Social', 'Updates', 'Forums', 'Promotions']
  await page.evaluate((targets) => {
    const labelDivs = document.querySelectorAll('div.al6');
    for (const div of labelDivs) {
      if (targets.includes(div.textContent.trim())) {
        const row = div.closest('tr');
        if (row) {
          for (const span of row.querySelectorAll('span.alP')) {
            if (span.textContent.trim() === 'hide') span.click();
          }
        }
      }
    }
  }, targets);
}
