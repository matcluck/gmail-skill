# Migrate Emails Between Labels (e.g. flatten `Example` -> `Category/Example`)

Use this when you need to move all emails from one label to another, then delete the source label. Common reason: cleaning up duplicate top-level labels that exist alongside a nested version with the same leaf name, such as both top-level `Example` and `Category/Example`.

## Approach

For each email in the source label:
1. **Apply** the destination label
2. **Remove** the source label
3. Confirm the source label view is empty
4. Delete the source label from settings

Two efficient toolbar tools to know about, *both available only when emails are selected and you are viewing a label*:

- `div[role="button"][aria-label="Labels"]` — opens the Label-as menu (multi-select checkbox list of all labels). Use to **add** a label.
- `div[role="button"][aria-label="Remove label \"<LabelName>\""]` — single click strips the current view's label from selected emails. **Faster than re-opening the Label menu to uncheck**.

## Gotchas

### 1. Applying a label via Label-as menu requires real mouse events

`element.click()` on a `[role="menuitemcheckbox"]` inside the Gmail Label menu **does not toggle** the checkbox. You must dispatch the full sequence:

```js
const r = item.getBoundingClientRect();
const opts = { bubbles: true, cancelable: true, view: window, button: 0,
                clientX: r.x + r.width/2, clientY: r.y + r.height/2 };
item.dispatchEvent(new MouseEvent('mouseover', opts));
item.dispatchEvent(new MouseEvent('mousedown', opts));
item.dispatchEvent(new MouseEvent('mouseup',   opts));
item.dispatchEvent(new MouseEvent('click',     opts));
```

Use the same event sequence for the Labels toolbar button itself if a plain `.click()` does not open the menu.

### 2. The Label-as menu auto-closes after one toggle

After ticking one menuitemcheckbox the popup closes. You **cannot** check `Category/Example` and uncheck `Example` in the same menu opening. Either:
- Toggle one label, let menu close, re-open menu, toggle next; OR
- Use the `Remove label "<X>"` toolbar button to strip the source label after applying the destination via the menu.

### 3. Stale "X of Y" counts in DOM

When you switch between views (Inbox → label view), Gmail leaves stale `1–N of N` count spans in the DOM. Filtering only by `/^\d+(–\d+)?\s+of\s+\d+/` gives multiple results from old views. To get the live count, prefer:
- `document.title` (for example, `"Category/Example" (1) - ...`), or
- visible-row count: `[...document.querySelectorAll('tr.zA')].filter(r => r.offsetParent !== null).length`, or
- the `<td>` containing `"There are no conversations with this label."` indicates an empty label view.

### 4. Distinguishing duplicate display names in settings

When both top-level `Example` and `Category/Example` exist, the settings labels page shows **both rows with the visible label "Example"** because the Zsjd8d div only contains the leaf segment. To pick the right one, inspect the inline `style="margin-left:..."`:

| `margin-left` | meaning |
|---|---|
| `0px` | top-level label |
| `12px` | nested one level, for example `Category/Example` |
| `24px` | nested two levels |

Selector for the top-level row only:

```js
const rows = [...document.querySelectorAll('tr')].filter(tr => {
  const div = tr.querySelector('td.alT div.Zsjd8d');
  return div
    && div.textContent.trim() === 'Example'
    && div.getAttribute('style') === 'margin-left:0px';
});
```

### 5. Selecting all rows on a single-page result

If the search/label result fits in one page (Gmail shows `1–N of N` with no Older button), the **"Select all conversations that match this search"** banner does **not** appear. Clicking the master select-all checkbox in the toolbar selects the visible rows, which IS all of them — no extra step needed. The banner only appears when there are more matches than fit on the current page.

## Full migration example

```js
// 1. After search and selecting all rows in the label view:
//    - Click div[role="button"][aria-label="Labels"]  (with full mouse events)
//    - In opened popup, click the destination label menuitemcheckbox (with full mouse events)
//    - Popup auto-closes after Apply.

// 2. Strip the source label while still in the source-label view:
const removeBtn = [...document.querySelectorAll('div[role="button"]')]
  .find(b => b.offsetParent !== null
          && b.getAttribute('aria-label') === 'Remove label "Example"');
// dispatch full mouse events on removeBtn

// 3. Verify source label is empty:
//    Look for td containing "There are no conversations with this label."

// 4. Navigate to #settings/labels and click the "remove" span on the
//    margin-left:0px row, then confirm in the alertdialog ("Delete" button).
```
