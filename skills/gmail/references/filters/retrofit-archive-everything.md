# Retrofit "Archive Everything" Filter → Inbox-First Two-Filter Pair

When the audit finds a single filter that silently archives ALL mail from a sender (`from:X` → Skip Inbox + Apply label), you can convert it to the inbox-first pair using one of three patterns depending on volume:

| Pattern | Calls | Use when |
|---|---|---|
| **Single-call per sender** | 1 | Default — fastest reliable per-sender |
| **Batch (5–8 senders / call)** | 1 per batch | Bulk retrofit (10+ senders) |
| **Per-sender split** | 2 | Debugging a problem sender |

All patterns rely on the **no-label-on-Filter-2 trick**: Filter 1 (the existing filter, converted to "stay in inbox") already labels every email from the sender. Filter 2 (new, conditional archive) doesn't need a label and must not mark mail as read — that means no listbox interaction → no snapshot+click → no extra round trips.

## When to retrofit

Triggers (from `../core/dump-state.js` results):
- Single filter with `skipInbox: true` AND `label: <something>`
- Sender is mixed important/promotional (banks, insurance, ISPs, big platforms, vendor accounts with promo)

Skip retrofit for:
- Pure-noise senders (job alerts, security newsletters) — keep archiving
- Pure-transactional (login codes, 2FA) — keep archiving
- Already inbox-first paired senders

## Pattern 1: Single-call per sender (1 MCP call)

```js
async () => {
  const errors = []; const sleep = ms => new Promise(r => setTimeout(r, ms)); const log = [];
  // ─── helpers ──────────────────────────────────────────────────────────────
  function findInputByLabel(text) { const lab = [...document.querySelectorAll('label')].find(l => l.offsetParent !== null && l.textContent.trim() === text); return lab ? document.getElementById(lab.getAttribute('for')) : null; }
  function findCheckboxByLabel(prefix) { const lab = [...document.querySelectorAll('label')].find(l => l.offsetParent !== null && l.textContent.trim().startsWith(prefix)); if (!lab) return null; const el = document.getElementById(lab.getAttribute('for')); return el?.type === 'checkbox' ? el : null; }
  function findClickable(text) { return [...document.querySelectorAll('a, button, [role="link"], [role="button"]')].find(el => el.textContent.trim() === text && el.offsetParent !== null); }
  function setVal(input, value) { const proto = window.HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true })); input.blur(); }
  async function pollUntil(fn, label, max = 60) { for (let i = 0; i < max; i++) { const v = fn(); if (v) return v; await sleep(50); } errors.push('TIMEOUT: ' + label); return null; }
  async function checkNoDialog(s) { await sleep(300); const w = [...document.querySelectorAll('[role="alertdialog"]')].find(d => d.offsetParent !== null && d.textContent.includes('Confirm creating filter')); if (w) { [...w.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancel')?.click(); errors.push('Dialog at ' + s + ': ' + w.textContent.substring(0,200)); return false; } return true; }

  // ─── CONFIG (edit per call) ───────────────────────────────────────────────
  const TARGET_CRITERIA = 'from:(<sender>)';   // exact criteria of existing filter
  const NEW_FROM        = '<sender>';            // From field for new Filter 2
  const NEW_SUBJECT     = '';                    // Optional: copy subject if existing filter had one
  const NEW_KEYWORDS    = '"keyword1" "keyword2" "keyword3"';

  // ─── Phase A: convert existing filter to base ─────────────────────────────
  const rows = [...document.querySelectorAll('tr')].filter(tr => { const m = tr.textContent.match(/Matches:\s*(.+?)\s*Do this:/s); return m && m[1].trim() === TARGET_CRITERIA; });
  if (rows.length !== 1) return { errors: ['EDIT match: ' + rows.length], target: TARGET_CRITERIA };
  [...rows[0].querySelectorAll('[role="link"]')][0].click();
  await pollUntil(() => findInputByLabel('Has the words'), 'edit form');
  findClickable('Continue')?.click();
  if (!(await checkNoDialog('Continue (edit)'))) return { errors, log };
  await pollUntil(() => findCheckboxByLabel('Skip the Inbox'), 'edit actions');
  const sA = findCheckboxByLabel('Skip the Inbox'); if (sA.checked) sA.click();
  const mA = findCheckboxByLabel('Mark as read'); if (mA.checked) mA.click();
  const nA = findCheckboxByLabel('Never send it to Spam'); if (!nA.checked) { nA.scrollIntoView({block:'center'}); nA.click(); }
  findClickable('Update filter')?.click();
  if (!(await checkNoDialog('Update'))) return { errors, log };
  await pollUntil(() => findClickable('Create a new filter'), 'return to list');
  log.push('Phase A done — existing converted to base');

  // ─── Phase B: create new Filter 2 (no label!) ─────────────────────────────
  findClickable('Create a new filter')?.click();
  await pollUntil(() => findInputByLabel('Has the words'), 'create form');
  setVal(findInputByLabel('From'), NEW_FROM);
  if (NEW_SUBJECT) setVal(findInputByLabel('Subject'), NEW_SUBJECT);
  setVal(findInputByLabel('Has the words'), NEW_KEYWORDS);
  await pollUntil(() => { const b = findClickable('Create filter'); return b && !b.disabled ? b : null; }, 'create btn enable');
  findClickable('Create filter')?.click();
  if (!(await checkNoDialog('advance'))) return { errors, log };
  await pollUntil(() => findCheckboxByLabel('Skip the Inbox'), 'create actions');
  const sB = findCheckboxByLabel('Skip the Inbox'); if (!sB.checked) sB.click();
  const mB = findCheckboxByLabel('Mark as read'); if (mB.checked) mB.click();
  const nB = findCheckboxByLabel('Never send it to Spam'); if (!nB.checked) { nB.scrollIntoView({block:'center'}); nB.click(); }
  const aB = findCheckboxByLabel('Also apply filter to'); if (!aB.checked) { aB.scrollIntoView({block:'center'}); aB.click(); }
  // ⚠️ DO NOT tick "Apply the label" — Filter 1 (just-converted) handles labeling
  findClickable('Create filter')?.click();
  if (!(await checkNoDialog('submit'))) return { errors, log };
  await pollUntil(() => findClickable('Create a new filter'), 'final return');
  log.push('Phase B done — new archive filter created');

  return { errors, log };
}
```

## Pattern 2: Multi-sender batch (1 MCP call for N senders)

Best for bulk audits where you have 5–8 senders to process. The single async eval iterates the list and returns per-sender outcomes.

```js
async () => {
  const SENDERS = [
    {
      criteria: 'from:(@sender1.com)',          // exact existing-filter criteria
      from:     '@sender1.com',                  // From for new archive filter
      subject:  '',                              // optional
      keywords: '"newsletter" "deal" "discount"',
    },
    {
      criteria: 'from:(@sender2.com)',
      from:     '@sender2.com',
      subject:  '',
      keywords: '"webinar" "training" "blog"',
    },
    // ... up to ~8 senders
  ];

  const results = [];
  // ── helpers (same as Pattern 1) ───
  // ... paste findInputByLabel, findCheckboxByLabel, findClickable, setVal, pollUntil, checkNoDialog ...

  for (const s of SENDERS) {
    const errors = []; const log = [];
    try {
      // Phase A: convert existing
      const rows = [...document.querySelectorAll('tr')].filter(tr => { const m = tr.textContent.match(/Matches:\s*(.+?)\s*Do this:/s); return m && m[1].trim() === s.criteria; });
      if (rows.length !== 1) { results.push({ sender: s.from, ok: false, errors: ['EDIT match: ' + rows.length] }); continue; }
      [...rows[0].querySelectorAll('[role="link"]')][0].click();
      await pollUntil(() => findInputByLabel('Has the words'), 'edit form');
      findClickable('Continue')?.click();
      if (!(await checkNoDialog('Continue'))) { results.push({ sender: s.from, ok: false, errors }); continue; }
      await pollUntil(() => findCheckboxByLabel('Skip the Inbox'), 'edit actions');
      const eSk = findCheckboxByLabel('Skip the Inbox'); if (eSk.checked) eSk.click();
      const eMk = findCheckboxByLabel('Mark as read'); if (eMk.checked) eMk.click();
      const eNs = findCheckboxByLabel('Never send it to Spam'); if (!eNs.checked) { eNs.scrollIntoView({block:'center'}); eNs.click(); }
      findClickable('Update filter')?.click();
      if (!(await checkNoDialog('Update'))) { results.push({ sender: s.from, ok: false, errors }); continue; }
      await pollUntil(() => findClickable('Create a new filter'), 'return');
      log.push('A done');

      // Phase B: create new archive
      findClickable('Create a new filter')?.click();
      await pollUntil(() => findInputByLabel('Has the words'), 'create form');
      setVal(findInputByLabel('From'), s.from);
      if (s.subject) setVal(findInputByLabel('Subject'), s.subject);
      setVal(findInputByLabel('Has the words'), s.keywords);
      await pollUntil(() => { const b = findClickable('Create filter'); return b && !b.disabled ? b : null; }, 'btn');
      findClickable('Create filter')?.click();
      if (!(await checkNoDialog('advance'))) { results.push({ sender: s.from, ok: false, errors }); continue; }
      await pollUntil(() => findCheckboxByLabel('Skip the Inbox'), 'create actions');
      const cSk = findCheckboxByLabel('Skip the Inbox'); if (!cSk.checked) cSk.click();
      const cMk = findCheckboxByLabel('Mark as read'); if (cMk.checked) cMk.click();
      const cNs = findCheckboxByLabel('Never send it to Spam'); if (!cNs.checked) { cNs.scrollIntoView({block:'center'}); cNs.click(); }
      const cAl = findCheckboxByLabel('Also apply filter to'); if (!cAl.checked) { cAl.scrollIntoView({block:'center'}); cAl.click(); }
      findClickable('Create filter')?.click();
      if (!(await checkNoDialog('submit'))) { results.push({ sender: s.from, ok: false, errors }); continue; }
      await pollUntil(() => findClickable('Create a new filter'), 'final');
      log.push('B done');

      results.push({ sender: s.from, ok: true, log });
    } catch (e) {
      results.push({ sender: s.from, ok: false, exception: String(e), errors });
    }
  }
  return { batchSize: SENDERS.length, results };
}
```

**Constraints:**
- Eval timeout: typically 30s. With ~3-4s per sender, batch size **5–8 senders is safe**, 10 is the upper limit. If you have 20 senders, run 3 batches.
- The browser stays on the filters page between senders, no navigation needed.

## Picking spam keywords

### Pre-validation (do BEFORE the eval to avoid dialog round-trips)

Reject the keyword string if it contains any of:
- **Forbidden operators** (cause "never match incoming mail" dialog): `is:`, `label:`, `in:`, `before:`, `after:`, `category:`, `has:yellow-star`, `older_than:`, `newer_than:`
- **Special chars** (cause "may have unexpected results" dialog): `%`, `[`, `]`, `(`, `)`, `&`, `#`, `*`, `!`, `$`, `£`, `:`

Substitution table:

| Avoid | Use instead |
|---|---|
| `"% off"` | `"discount"`, `"save on"`, `"off today"` |
| `"100% guaranteed"` | `"guaranteed"` |
| `"shop & save"` | `"shop and save"` |
| `"news!"` | `"news"` |
| `"$50 off"` | `"50 off"` or just `"discount"` |
| `"re:Invent"` | `"reinvent"` |

### Sender-type starter packs

| Type | Keywords |
|---|---|
| Newsletter / promo | `"newsletter" "discount" "exclusive offer" "save on" "shop now" "limited time"` |
| Vendor account marketing | `"deal" "recommendations" "you might like" "trending" "today only" "lightning deal"` |
| Subscription engagement | `"webinar" "training" "blog" "what's new" "join us" "register now" "announcing"` |
| LinkedIn-style | `"appeared in" "trending" "you may know" "people you may" "recommended for you" "premium"` |
| Bank promo | `"newsletter" "rewards offer" "exclusive offer" "shop with" "limited time" "save on" "discount"` |
| Utility tips | `"newsletter" "tips" "blog" "survey" "saving" "campaign"` |
