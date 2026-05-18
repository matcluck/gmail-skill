# Filter Criteria Gotchas — Things Gmail's Filter Engine Won't Accept

Verified against live Gmail. Update this file when Gmail filter criteria behavior changes.

## ❌ NEVER use in `Has the words` / `Doesn't have` (Gmail says "never match incoming mail")

Filters run at delivery, BEFORE Gmail computes importance/labels/categories/stars. These operators reference signals that don't exist yet:

| Operator | Why it fails |
|---|---|
| `is:important`, `is:starred`, `is:unread`, `is:read` | All `is:` flags computed at/after delivery |
| `label:foo` | Labels applied by THIS filter chain, not before |
| `in:inbox`, `in:sent`, `in:trash` | Folder placement happens after filters |
| `before:`, `after:`, `older_than:`, `newer_than:` | Date queries don't apply to incoming mail |
| `has:yellow-star`, `has:blue-info` | Star colors are user-applied post-delivery |
| `category:promotions`, `category:social` | Categories computed at/after delivery |

If you try, Gmail throws this dialog: *"Filter searches containing 'label:', 'in:', 'is:', date range or stars criteria are not recommended as they will never match incoming mail. Do you still wish to continue to the next step?"*

The right answer is always **Cancel**. There's no workaround inside Gmail's filter engine — you'd need post-delivery automation (Apps Script, IMAP daemon).

## ⚠️ AVOID special characters (Gmail warns "may have unexpected results")

These trigger a dismissable warning dialog. The filter MIGHT work but behavior is inconsistent:

`%` `[` `]` `(` `)` `&` `#` `*` `!` `$` `£` `:`

**Substitutions:**

| Avoid | Use instead |
|---|---|
| `"% off"` | `"discount"`, `"save on"`, `"off today"`, `"off your"` |
| `"re:Invent"` | `"reinvent"` |
| `"shop & save"` | `"shop and save"` (or split into two phrases) |
| `"100% guaranteed"` | `"guaranteed"` |
| `"news!"` | `"news"` |
| `"$50 off"` | `"50 off"` or `"discount"` |

Stick to plain alphanumeric phrases plus apostrophes (`"hasn't"`, `"don't"`) — those are fine.

## ✅ SAFE patterns (verified working)

- Quoted phrases of any length: `"weekly digest"`, `"receipt available"`
- Use one skip filter per independently skippable phrase. A rule containing multiple unrelated quoted phrases can behave too narrowly and miss messages that contain only one phrase.
- Apostrophes inside quotes: `"hasn't sold yet"`, `"let us know how we're doing"`
- Hyphens and slashes inside quotes: `"sign-in"`, `"opt-out"`
- Search operators in `From` field only: `from:(@example.com OR sender@example.net)` — note this is the From field, not Has-words

## Confirm dialog handler pattern

If you build automation that submits filter forms, ALWAYS check for this dialog after clicking Continue / Update / Create. Pattern:

```js
async function checkNoConfirmDialog() {
  await sleep(300);
  const warn = [...document.querySelectorAll('[role="alertdialog"]')]
    .find(d => d.offsetParent !== null && d.textContent.includes('Confirm creating filter'));
  if (warn) {
    const cancelBtn = [...warn.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancel');
    cancelBtn?.click();
    return { dialogText: warn.textContent };
  }
  return null;
}
```
