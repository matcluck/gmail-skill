# Bulk Archive Emails by Sender

Pattern for archiving inbox emails from many senders in a single browser session — and ideally a single eval call.

## When to use

- User asks to clean up old emails from N senders (e.g. "archive everything from these 16 unsubscribed senders")
- After bulk-unsubscribing, sweep up the residual emails
- Retroactive archive following a freshly created skip-inbox filter (Gmail's "also apply to existing" only labels — it does NOT skip inbox or mark read for existing emails)

## Cost targets

| Pattern | Calls per N senders | Use when |
|---|---|---|
| **Pattern A: Single eval, multi-sender** | 1 eval | 5–10 senders, all "search → select all → archive" |
| **Pattern B: Single eval per sender** | 1 eval / sender | When per-sender label changes are needed before archive |
| **Pattern C: Manual UI loop (DEPRECATED)** | ~10–30 calls / sender | Don't use — agents kept reinventing this slowly |

## Pattern A — Multi-sender archive in ONE eval

```js
async () => {
  const SENDERS = [
    'sender1@example.com',
    'sender2@example.com',
    'sender3@example.com',
    // ... up to ~10 senders
  ];

  const results = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Helpers
  function findClickable(text) {
    return [...document.querySelectorAll('a, button, [role="link"], [role="button"]')]
      .find(el => el.textContent.trim() === text && el.offsetParent !== null);
  }
  async function pollUntil(fn, label, max = 60) {
    for (let i = 0; i < max; i++) { const v = fn(); if (v) return v; await sleep(50); }
    return null;
  }
  function visibleTable() {
    return [...document.querySelectorAll('table.F')].find(t => t.offsetParent !== null);
  }
  function dispatchMouse(el, type) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }

  for (const sender of SENDERS) {
    try {
      // Search via URL hash (cheaper than typing in search box)
      window.location.hash = `#search/from%3A${encodeURIComponent(sender)}+in%3Ainbox`;
      await sleep(800);
      await pollUntil(() => visibleTable(), 'search results');

      // Count rows in visible table
      const tbl = visibleTable();
      if (!tbl) { results.push({ sender, ok: false, error: 'no table' }); continue; }
      const rows = [...tbl.querySelectorAll('tr.zA')].filter(r => r.offsetParent !== null);
      if (rows.length === 0) { results.push({ sender, ok: true, count: 0, note: 'nothing to archive' }); continue; }

      // Select all via header checkbox in toolbar (covers "select all visible")
      const selectAll = document.querySelector('[role="main"] [aria-label="Select"]');
      if (selectAll) {
        ['mousedown', 'mouseup', 'click'].forEach(t => dispatchMouse(selectAll, t));
        await sleep(150);
      }

      // If "select all conversations matching" banner shows, click it (handles >100)
      const selAll = [...document.querySelectorAll('[role="main"] span')]
        .find(s => /Select all \d+ conversations/i.test(s.textContent) && s.offsetParent !== null);
      if (selAll) {
        ['mousedown', 'mouseup', 'click'].forEach(t => dispatchMouse(selAll, t));
        await sleep(200);
      }

      // Click Archive (toolbar button)
      const archive = [...document.querySelectorAll('[role="main"] [data-tooltip="Archive"]')]
        .find(el => el.offsetParent !== null);
      if (!archive) { results.push({ sender, ok: false, error: 'no archive button' }); continue; }
      ['mousedown', 'mouseup', 'click'].forEach(t => dispatchMouse(archive, t));
      await sleep(600);

      results.push({ sender, ok: true, count: rows.length });
    } catch (e) {
      results.push({ sender, ok: false, error: String(e) });
    }
  }
  return results;
}
```

## Steps to invoke (3 MCP calls total for N senders)

1. `browser_navigate("https://mail.google.com/mail/u/0/#inbox")`
2. `browser_resize(1500, 950)`
3. `browser_evaluate(<the function above with SENDERS list>)`

## DOM gotchas

- **Visible table**: `tr.zA` matches stale cached rows. Always filter by `tbl.offsetParent !== null` first then iterate rows inside.
- **MouseEvent sequence**: Toolbar buttons require `mousedown` + `mouseup` + `click` — bare `.click()` doesn't trigger Gmail's handler.
- **`[data-tooltip="Archive"]`** returns multiple matches (one per cached toolbar). Filter to the visible one inside `[role="main"]`.
- **"Select all" banner**: only appears when results exceed one page (~50 rows). Inner check uses regex on the banner text.
- **URL hash search**: `#search/from%3Asender+in%3Ainbox` is faster than typing — no focus/blur/debounce delays.
- **Sleep durations**: 800ms after search, 600ms after archive, 150-200ms between mouse events. Tune up if Gmail is slow.

## Variant: Apply label + archive (Pattern B)

When you need to apply a different label to each sender's emails before archiving (e.g. Health cluster), wrap the archive step with a label-apply step:

```js
// After selecting all, before archive:
const labelsBtn = [...document.querySelectorAll('[role="main"] [data-tooltip="Labels"]')]
  .find(el => el.offsetParent !== null);
['mousedown', 'mouseup', 'click'].forEach(t => dispatchMouse(labelsBtn, t));
await sleep(300);

// Find the menuitemcheckbox for the target label
const labelItem = [...document.querySelectorAll('[role="menuitemcheckbox"]')]
  .find(mi => mi.textContent.trim() === labelName && mi.offsetParent !== null);
['mousedown', 'mouseup', 'click'].forEach(t => dispatchMouse(labelItem, t));
await sleep(400);
// Menu auto-closes; selection is preserved. Now click Archive as before.
```
