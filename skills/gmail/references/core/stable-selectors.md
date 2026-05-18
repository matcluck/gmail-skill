# Stable vs. Unstable Selectors in Gmail

Gmail's CSS class names (`.sA`, `.aQa`, `.btj`) are obfuscated build artifacts that rotate. Element IDs (`:173`, `:bd`) are generated per page load. **Never hardcode either.** Detect by stable signals.

## Canonical pattern

**Every form field on the filter page is a proper `<label for="...">` paired with an input.** This is the golden chain — works regardless of class/ID churn:

```js
function findCheckboxByLabel(textContains) {
  const lab = [...document.querySelectorAll('label')]
    .find(l => l.offsetParent !== null && l.textContent.trim().startsWith(textContains));
  if (!lab) return null;
  const el = document.getElementById(lab.getAttribute('for'));
  return el?.type === 'checkbox' ? el : null;
}

function findInputByLabel(textExact) {
  const lab = [...document.querySelectorAll('label')]
    .find(l => l.offsetParent !== null && l.textContent.trim() === textExact);
  if (!lab) return null;
  return document.getElementById(lab.getAttribute('for'));
}
```

**Use `startsWith`/`includes` for checkboxes** (label text often has parentheticals like "Skip the Inbox (Archive it)" or dynamic counts like "Also apply filter to 0 matching conversations.").

**Use exact match for text inputs** (From, To, Subject, etc. — those labels are clean).

## Verified mappings

### Filter criteria page

| Field | `<label>` text (exact) | Input |
|---|---|---|
| From | `From` | `text` |
| To | `To` | `text` |
| Subject | `Subject` | `text` |
| Has the words | `Has the words` | `text` |
| Doesn't have | `Doesn't have` | `text` |
| Size | `Size` | custom widget |
| Has attachment | `Has attachment` | `checkbox` |
| Don't include chats | `Don't include chats` | `checkbox` |

### Filter actions page

| Field | `<label>` text (exact, including parentheticals) | Input |
|---|---|---|
| Skip Inbox | `Skip the Inbox (Archive it)` | `checkbox` |
| Mark as read | `Mark as read` | `checkbox` |
| Star it | `Star it` | `checkbox` |
| Apply label | `Apply the label:` | `checkbox` |
| Forward it | `Forward it to:` | `checkbox` |
| Delete it | `Delete it` | `checkbox` |
| Never spam | `Never send it to Spam` | `checkbox` |
| Always important | `Always mark it as important` | `checkbox` |
| Never important | `Never mark it as important` | `checkbox` |
| Categorize | `Categorize as:` | `checkbox` |
| Also apply to existing | `Also apply filter to N matching conversations.` (N dynamic) | `checkbox` |

**i18n note:** "Categorize" appears as US English on this account. UK English would be "Categorise". Match on `startsWith('Categori')` to handle both.

### Gmail input quirk: button stays disabled

The "Create filter" button (advance to actions page) stays `disabled` until Gmail's change handler fires. Setting value via `input` event isn't enough — must also dispatch `keyup` and `blur`:

```js
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
input.blur();
// Then poll for ~50ms before button becomes !disabled
```

In practice the button enables in **~50ms** after blur. Use a 50ms async poll loop inside the same `evaluate()` to avoid an extra round trip.

## What's STABLE — use these

| Signal | Example |
|---|---|
| `<label for="...">` → `getElementById()` | All filter fields, all checkboxes |
| ARIA roles | `[role="link"]`, `[role="listbox"]`, `[role="option"]`, `[role="alertdialog"]`, `[role="combobox"]` |
| `aria-label` attributes | `aria-label="Search mail"`, `aria-label="Size value"` |
| Visible text content | "Create a new filter", "Create filter", "OK", "Notifications" |
| URL hash routes | `#settings/filters`, `#settings/labels`, `#create-filter` |
| HTML5 semantic tags | `<label>`, `<table>`, `<tr>`, `<td>` |

## What's UNSTABLE — never hardcode

| Anti-pattern | Why it breaks |
|---|---|
| `.sA`, `.aQa`, `.aQb`, `.btj`, `.aP9`, `.aQd`, `.aQf`, `.zA`, `.bog`, `.alP`, `.e5` | Obfuscated; rotated between Gmail builds |
| `id=":bd"`, `id=":173"`, `id=":1or"` | Auto-generated per page load |
| Position-only `cbs[3]` | Order may change |
| Exact text match on checkboxes | Parentheticals/dynamic counts break it |

## Confirmed clickable patterns

| Element | How to find |
|---|---|
| "Create a new filter" link | `[role="link"]` whose `textContent.trim() === 'Create a new filter'` |
| Filter row Edit/Delete | `[role="link"]` inside the `<tr>` with `'Matches:'` text |
| "Create filter" submit | `<button>` with `textContent === 'Create filter'` AND `!disabled` |
| Label dropdown | `[role="listbox"]` — open via `mousedown`+`mouseup` MouseEvent |
| Label option | `[role="option"]` — **must** click via `browser_click(ref=…)` from snapshot. JS dispatch is intercepted by overlay. |
| Alertdialog OK | `<button>` with `textContent === 'OK'` inside `[role="alertdialog"]` |

## Drift detection

Run `test-selectors.js` (or its inline snippets) at the start of any session that does heavy filter work. If anything fails, snapshot the page, find the new pattern, and update this file before proceeding.
