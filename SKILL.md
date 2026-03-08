# Gmail Inbox Management via Playwright

Automate Gmail label, filter, and color management using Claude Code with the Playwright MCP server.

## Setup

### 1. Check for Playwright MCP

Before starting, verify the Playwright MCP server is available. Try calling any Playwright tool (e.g., `browser_navigate`). If it fails or is not found:
- Ask the user to install the Playwright MCP plugin: `/install-plugin playwright`
- Then restart Claude Code

### 2. Launch Browser & Login

1. Navigate to `https://mail.google.com` using `browser_navigate`
2. Take a screenshot to check the current state
3. If the user is not logged in, **ask them to log in manually** — do not attempt to automate login (security credentials should never be handled by automation)
4. Say: "Please log into your Gmail account in the browser window. Let me know once you're signed in and I'll get started."
5. Once confirmed, take a screenshot to verify you're on the Gmail inbox

### Key URLs

- Inbox: `https://mail.google.com/mail/u/0/#inbox`
- Labels settings: `https://mail.google.com/mail/u/0/#settings/labels`
- Filters settings: `https://mail.google.com/mail/u/0/#settings/filters`

## Workflow

1. **Audit labels** — list all labels, identify clutter, missing categories, inconsistent naming
2. **Design hierarchy** — group labels into top-level categories (see below)
3. **Rename/move labels** — fix naming, nest under correct parents
4. **Color labels** — assign colors by category, inherit to children
5. **Audit filters** — check for duplicates, missing actions, wrong labels
6. **Create/fix filters** — ensure every recurring sender has a filter with appropriate actions
7. **Retroactive cleanup** — apply filters to existing conversations, archive old inbox items
8. **Archive completed items** — move finished events/projects to an archive label

## Reference Functions

Read from `references/` when needed — don't memorize, just look up:

| File | What it does |
|---|---|
| `list-labels.js` | List all user labels |
| `create-label.js` | Create a new label |
| `rename-label.js` | Rename an existing label |
| `move-label.js` | Unnest or re-nest a label under a different parent |
| `set-label-color.js` | Set a label's color from the sidebar (includes all 24 RGB presets) |
| `create-filter.js` | Create a new email filter with label assignment |
| `edit-filter.js` | Edit an existing filter's criteria or actions |
| `archive-from-inbox.js` | Select and archive emails by sender from inbox |
| `delete-from-sender.js` | Search and bulk-delete all emails from a sender |
| `remove-label-from-emails.js` | Remove a label from selected emails |
| `hide-category-labels.js` | Hide Gmail category tabs (Social, Promotions, etc.) |

## Key DOM Gotchas

- **Edit/remove links** are `<span class="alP">`, NOT `<a>` tags
- **Filter edit/delete links** are `<span class="sA">`, NOT `<a>` tags
- **Overlays** can intercept clicks — use `{ force: true }`
- **"Nest label under" combobox** is a custom div, NOT a `<select>` — do NOT use `selectOption()`
- **Label display names** in settings show only the leaf name, not the full path
- **`CSS.escape()`** is NOT available in Playwright's Node context — use XPath selectors for `data-label-name`
- **Gmail search**: use `in:inbox` not `label:inbox`
- **"Restaurants"** is a reserved Gmail system label — use "Dining" instead

## Recommended Label Organization

### Suggested Top-Level Categories

| Category | Purpose | Example Children |
|---|---|---|
| Career | Job/employment related | Employment, Recruiters |
| Events | One-off or temporary events | Wedding, Holiday Trip |
| Finance | Banking, accounting, tax | Accounting/FY24-25, Share Registry |
| Gift Cards | Gift card emails & used cards | Used |
| Government | Government correspondence | Tax Office, Medicare |
| Insurance | Insurance policies | Home, Car |
| Mailing Lists | Newsletters & mailing lists | Industry News, Community |
| Notifications | Automated system notifications | Transit, Banking Alerts |
| Projects | Ongoing projects | 3D Printing, Volunteer Work |
| Property | Property/housing related | 123 Main St, Rental |
| Subscriptions | Recurring paid/free services | Spotify, Gym Membership |
| zArchive | Completed/inactive items | Old events, past FY tax records |

The `z` prefix in `zArchive` pushes it to the bottom of the alphabetical sidebar.

### Naming Conventions

- **Clear & descriptive** — names should make sense at a glance
- **Financial years** — FY23-24, FY24-25 format (hyphenated, two-digit years)
- **Sublabel paths** — use `/` separator (e.g., `Gift Cards/Used`, `Subscriptions/Spotify`)

### Color Scheme

Parent labels get a color; children inherit via "Label and its sublabels" dialog. Each top-level category should have a unique, visually distinct color. Choose a cohesive, beautiful palette — avoid clashing or overly similar colors next to each other.

Example palette (not prescriptive — adapt to the user's categories):

| Category | Color | RGB |
|---|---|---|
| Career | Blue | 73, 134, 231 |
| Events | Orange | 255, 117, 55 |
| Finance | Green | 22, 167, 101 |
| Gift Cards | Yellow | 251, 233, 131 |
| Government | Teal | 45, 162, 187 |
| Insurance | Light purple | 227, 215, 255 |
| Mailing Lists | Pink | 246, 145, 178 |
| Notifications | Light teal | 152, 215, 228 |
| Projects | Purple | 185, 154, 255 |
| Property | Coral | 242, 178, 168 |
| Subscriptions | Peach | 255, 200, 175 |
| zArchive | Grey | 194, 194, 194 |

Gmail has 24 preset colors — see `references/set-label-color.js` for the full RGB grid. When assigning colors to new categories, pick from the presets that best complement the existing palette.

### Filter Best Practices

- **Standard**: Skip Inbox + Apply Label + Never send to Spam + Also apply to matching conversations
- **Noisy/newsletters**: also add **Mark as Read** to prevent unread badge noise
- **Actionable notifications** (e.g., payment reminders): **Stay in inbox**, just apply label
- **Always check** "Also apply to matching conversations" — retroactively labels existing emails
- **Prefer specific senders** over shared platform domains (e.g., `@birdeye.com` is used by many businesses)
- **One filter per sender** when they need different skip/read behaviors

### Archiving & Lifecycle

- **Completed events** → move label to zArchive
- **Old financial years** → move to zArchive/Accounting/FY23-24 (replicate parent structure)
- **After retroactive labeling**: select inbox items and archive manually
- **Unused labels**: remove or archive, don't leave cluttered

### Handling Spam & Unwanted Email

During the audit, you'll likely find recurring junk/marketing emails with no filter. Don't get sidetracked — focus on labels and filters first.

1. Create a `Spam/To Unsubscribe` label
2. Label any identified junk emails and move them there for now
3. **Only after** all labels, filters, and colors are sorted, offer to help the user work through the `To Unsubscribe` label
4. Unsubscribing is manual — advise the user to open each email and use the unsubscribe link themselves (automating unsubscribe flows is beyond the scope of this skill)
