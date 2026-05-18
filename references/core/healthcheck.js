// healthcheck.js — END-TO-END DRIFT DETECTION (FAST PATH)
//
// Detects Gmail UI drift in ~25-30s using only 5 MCP calls.
//
// Key insight: Gmail's settings pages are a single-page app — hash changes
// (#settings/filters → #create-filter → ...) keep the JS context alive.
// One async evaluate() can drive the WHOLE filter creation flow by polling
// for new DOM after each click instead of bouncing back to wait_for.
//
// USAGE (5 MCP calls, ~30s):
//
//   1. browser_resize(1500, 950)
//   2. browser_navigate("https://mail.google.com/mail/u/0/#settings/filters")
//   3. browser_evaluate(<HEALTHCHECK_FILTERS_FLOW>, filename="healthcheck-filters.json")
//   4. browser_navigate("https://mail.google.com/mail/u/0/#settings/labels")
//      ↑ also discards the test draft from step 3
//   5. browser_evaluate(<HEALTHCHECK_LABELS>, filename="healthcheck-labels.json")
//
// Then read the two JSON files, build the report. Every key should be `true`
// or a positive number. Any false / null = drift, STOP and update selectors.

// ─── HEALTHCHECK_FILTERS_FLOW ───────────────────────────────────────────────
// Drives the entire filter creation flow inside one async evaluate.
// Returns: { filtersList, form, fillTimingMs, actions, errors[] }
//
// Polling helpers wait up to N×50ms for DOM to settle. If you see timeouts,
// Gmail has slowed and you should bump the budget.
const HEALTHCHECK_FILTERS_FLOW = `async () => {
  const errors = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function findInputByLabel(text) {
    const lab = [...document.querySelectorAll('label')]
      .find(l => l.offsetParent !== null && l.textContent.trim() === text);
    return lab ? document.getElementById(lab.getAttribute('for')) : null;
  }
  function findCheckboxByLabel(prefix) {
    const lab = [...document.querySelectorAll('label')]
      .find(l => l.offsetParent !== null && l.textContent.trim().startsWith(prefix));
    if (!lab) return null;
    const el = document.getElementById(lab.getAttribute('for'));
    return el?.type === 'checkbox' ? el : null;
  }
  function findClickable(text) {
    return [...document.querySelectorAll('a, button, [role="link"], [role="button"]')]
      .find(el => el.textContent.trim() === text && el.offsetParent !== null);
  }
  function setVal(input, value) {
    const proto = window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    input.blur();
  }
  async function pollUntil(fn, label, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      const v = fn();
      if (v) return { value: v, attempts: i };
      await sleep(50);
    }
    errors.push('TIMEOUT: ' + label + ' after ' + (maxAttempts * 50) + 'ms');
    return { value: null, attempts: maxAttempts };
  }

  // ─── PHASE 1: Probe filters list page ─────────────────────────────────────
  const createLink = findClickable('Create a new filter');
  const filterRows = [...document.querySelectorAll('tr')].filter(tr => tr.textContent.includes('Matches:'));
  const filtersList = {
    createFilterLink: !!createLink,
    filterRowCount: filterRows.length,
    filterRowEditDelete: filterRows[0] ? filterRows[0].querySelectorAll('[role="link"]').length >= 2 : null,
  };
  if (!createLink) { errors.push('FATAL: no Create a new filter link'); return { filtersList, errors }; }

  // ─── PHASE 2: Open dialog, poll for form ──────────────────────────────────
  createLink.click();
  await pollUntil(() => findInputByLabel('Has the words'), 'filter form to render');

  const formProbe = {};
  for (const lab of ['From', 'To', 'Subject', 'Has the words', "Doesn't have"]) {
    const inp = findInputByLabel(lab);
    formProbe[lab] = inp?.tagName === 'INPUT' && inp.type === 'text';
  }
  const advanceBtn0 = findClickable('Create filter');
  formProbe.createFilterButton = !!advanceBtn0;
  formProbe.createFilterStartsDisabled = advanceBtn0?.disabled === true;

  // ─── PHASE 3: Fill From, time button enable, advance ──────────────────────
  const fromInp = findInputByLabel('From');
  if (!fromInp) { errors.push('FATAL: From input not found after form rendered'); return { filtersList, form: formProbe, errors }; }
  setVal(fromInp, 'healthcheck@example.com');
  const fillStart = performance.now();
  const enableResult = await pollUntil(
    () => { const b = findClickable('Create filter'); return b && !b.disabled ? b : null; },
    'Create filter button to enable',
    20
  );
  const fillTimingMs = Math.round(performance.now() - fillStart);
  if (!enableResult.value) return { filtersList, form: formProbe, fillTimingMs, errors };
  enableResult.value.click();

  // ─── PHASE 4: Poll for actions page, probe checkboxes ─────────────────────
  await pollUntil(() => findCheckboxByLabel('Skip the Inbox'), 'actions page to render');
  const actions = {};
  for (const p of ['Skip the Inbox','Mark as read','Star it','Apply the label','Forward it','Delete it','Never send it to Spam','Always mark it as important','Never mark it as important','Categori','Also apply filter to']) {
    actions[p] = !!findCheckboxByLabel(p);
  }
  actions.listbox = !!document.querySelector('[role="listbox"]');

  return { filtersList, form: formProbe, fillTimingMs, actions, errors };
}`;

// ─── HEALTHCHECK_LABELS ─────────────────────────────────────────────────────
// Run after navigating to #settings/labels (which also discards the filter draft).
const HEALTHCHECK_LABELS = `async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // Poll briefly in case the page is still rendering
  let btn = null;
  for (let i = 0; i < 40; i++) {
    btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create new label'));
    if (btn) break;
    await sleep(50);
  }
  const rows = [...document.querySelectorAll('tr')].filter(tr => {
    const links = [...tr.querySelectorAll('[role="link"]')].map(l => l.textContent.trim());
    return links.includes('remove') && links.includes('edit');
  });
  return {
    createNewLabelBtn: !!btn,
    labelRowsFound: rows.length,
    error: btn ? null : 'TIMEOUT: Create new label button not found after 2000ms',
  };
}`;

// ─── REPORT BUILDER ─────────────────────────────────────────────────────────
// After running both, build a single PASS/FAIL summary:
//
//   PASS if:
//     - filtersList.createFilterLink === true
//     - filtersList.filterRowCount > 0 (or absent — only meaningful if user has filters)
//     - every form.* === true
//     - fillTimingMs <= 200 (WARN if >200, FAIL if null)
//     - every actions.* === true
//     - labels.createNewLabelBtn === true
//     - errors.length === 0
//
// Save report to last-healthcheck.json so subsequent runs can diff.

module.exports = { HEALTHCHECK_FILTERS_FLOW, HEALTHCHECK_LABELS };
