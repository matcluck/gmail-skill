// test-selectors.js — Drift detector for Gmail selectors
//
// Run at the START of any heavy gmail session. Each snippet below is
// pasted verbatim into a browser_evaluate() call. The returned object reports
// pass/fail per selector. ANY false → snapshot, find new pattern, update
// ../core/stable-selectors.md BEFORE doing real work.
//
// Validated against Gmail's US English UI.

// ─── ROUTINE ────────────────────────────────────────────────────────────────
//   1. browser_navigate("https://mail.google.com/mail/u/0/#settings/filters")
//   2. browser_wait_for(text="Create a new filter")
//   3. browser_evaluate(<TEST_FILTERS_LIST_PAGE>)
//   4. browser_evaluate(<OPEN_FILTER_DIALOG>) → click "Create a new filter"
//   5. browser_wait_for(text="Has the words")
//   6. browser_evaluate(<TEST_FILTER_FORM_PAGE>)
//   7. browser_evaluate(<FILL_AND_ADVANCE>) → fills From, polls until enabled, clicks Create filter
//   8. browser_wait_for(text="Skip the Inbox")
//   9. browser_evaluate(<TEST_FILTER_ACTIONS_PAGE>)
//  10. browser_navigate(filters URL) to discard the test draft. DO NOT submit.
//  11. browser_navigate(labels URL) + browser_evaluate(<TEST_LABELS_PAGE>)

// ─── TEST_FILTERS_LIST_PAGE ─────────────────────────────────────────────────
const TEST_FILTERS_LIST_PAGE = `() => {
  const r = {};
  const link = [...document.querySelectorAll('[role="link"]')]
    .find(el => el.textContent.trim() === 'Create a new filter');
  r.createFilterLink = !!link;
  const filterRow = [...document.querySelectorAll('tr')].find(tr => tr.textContent.includes('Matches:'));
  r.filterRowFound = !!filterRow;
  if (filterRow) {
    const links = filterRow.querySelectorAll('[role="link"]');
    r.filterRowEditDelete = links.length >= 2;
  }
  return r;
}`;

// ─── OPEN_FILTER_DIALOG ─────────────────────────────────────────────────────
const OPEN_FILTER_DIALOG = `() => {
  const link = [...document.querySelectorAll('[role="link"]')]
    .find(el => el.textContent.trim() === 'Create a new filter');
  link?.click();
  return !!link;
}`;

// ─── TEST_FILTER_FORM_PAGE (criteria step) ──────────────────────────────────
const TEST_FILTER_FORM_PAGE = `() => {
  function findInputByLabel(text) {
    const lab = [...document.querySelectorAll('label')]
      .find(l => l.offsetParent !== null && l.textContent.trim() === text);
    return lab ? document.getElementById(lab.getAttribute('for')) : null;
  }
  const r = {};
  for (const lab of ['From', 'To', 'Subject', 'Has the words', "Doesn't have"]) {
    const inp = findInputByLabel(lab);
    r[lab] = inp?.tagName === 'INPUT' && inp.type === 'text';
  }
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Create filter');
  r.createFilterButton = !!btn;
  r.createFilterButtonStartsDisabled = btn?.disabled === true;  // expected true before fill
  return r;
}`;

// ─── FILL_AND_ADVANCE (test the disabled→enabled transition) ────────────────
const FILL_AND_ADVANCE = `async () => {
  function findInputByLabel(text) {
    const lab = [...document.querySelectorAll('label')]
      .find(l => l.offsetParent !== null && l.textContent.trim() === text);
    return lab ? document.getElementById(lab.getAttribute('for')) : null;
  }
  function setVal(input, value) {
    const proto = window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    input.blur();
  }
  const fromInp = findInputByLabel('From');
  setVal(fromInp, 'test-drift-probe@example.com');
  let enabledAt = null;
  for (let i = 0; i < 50; i++) {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Create filter');
    if (btn && !btn.disabled) { enabledAt = i * 50; break; }
    await new Promise(r => setTimeout(r, 50));
  }
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Create filter');
  if (btn && !btn.disabled) btn.click();
  return { value: fromInp.value, enabledAtMs: enabledAt };
  // Expected enabledAtMs ≤ 200ms. If higher, Gmail's input handling has slowed.
}`;

// ─── TEST_FILTER_ACTIONS_PAGE ───────────────────────────────────────────────
const TEST_FILTER_ACTIONS_PAGE = `() => {
  function findCheckboxByLabel(textPrefix) {
    const lab = [...document.querySelectorAll('label')]
      .find(l => l.offsetParent !== null && l.textContent.trim().startsWith(textPrefix));
    if (!lab) return null;
    const el = document.getElementById(lab.getAttribute('for'));
    return el?.type === 'checkbox' ? el : null;
  }
  const r = {};
  const cbPrefixes = [
    'Skip the Inbox',
    'Mark as read',
    'Star it',
    'Apply the label',
    'Forward it',
    'Delete it',
    'Never send it to Spam',
    'Always mark it as important',
    'Never mark it as important',
    'Categori',  // matches both Categorize (US) and Categorise (UK)
    'Also apply filter to',
  ];
  for (const p of cbPrefixes) r[p] = !!findCheckboxByLabel(p);
  r.listbox = !!document.querySelector('[role="listbox"]');
  r.createFilterSubmit = [...document.querySelectorAll('button')]
    .some(b => b.textContent.trim() === 'Create filter' && !b.disabled);
  return r;
}`;

// ─── TEST_LABELS_PAGE ───────────────────────────────────────────────────────
const TEST_LABELS_PAGE = `() => {
  const r = {};
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create new label'));
  r.createNewLabelBtn = !!btn;
  // Label rows: <tr> containing both 'remove' and 'edit' [role="link"]s
  const rows = [...document.querySelectorAll('tr')].filter(tr => {
    const links = [...tr.querySelectorAll('[role="link"]')].map(l => l.textContent.trim());
    return links.includes('remove') && links.includes('edit');
  });
  r.labelRowsFound = rows.length;
  return r;
}`;

// ─── TEST_LABEL_DIALOG (after clicking Create new label) ────────────────────
const TEST_LABEL_DIALOG = `() => {
  const r = {};
  const dialog = document.querySelector('[role="alertdialog"]');
  r.dialogPresent = !!dialog;
  if (dialog) {
    r.nameInput = !!dialog.querySelector('input[type="text"]');
    r.nestCheckbox = !!dialog.querySelector('input[type="checkbox"]');
    r.nestCombobox = !!dialog.querySelector('[role="combobox"]');
    r.createBtn = !![...dialog.querySelectorAll('button')].find(b => b.textContent.trim() === 'Create');
  }
  return r;
}`;

module.exports = {
  TEST_FILTERS_LIST_PAGE,
  OPEN_FILTER_DIALOG,
  TEST_FILTER_FORM_PAGE,
  FILL_AND_ADVANCE,
  TEST_FILTER_ACTIONS_PAGE,
  TEST_LABELS_PAGE,
  TEST_LABEL_DIALOG,
};
