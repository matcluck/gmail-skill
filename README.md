# Gmail Inbox Management Skill

A Claude Code skill for automating Gmail label, filter, and color management using the Playwright MCP plugin.

## What it does

- Audits and organizes Gmail labels into a clean hierarchy
- Creates, renames, moves, and colors labels
- Creates and edits email filters with best-practice settings
- Bulk archives/deletes emails by sender
- Helps triage spam and unwanted subscriptions

## Setup

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
2. Install the Playwright MCP plugin: `/install-plugin playwright`
3. Clone this repo into your skills directory:
   ```bash
   git clone https://github.com/matcluck/gmail-skill.git ~/.claude/skills/gmail-skill
   ```
4. Start a conversation and ask Claude to help organize your Gmail

Claude will launch a browser, ask you to log in, and walk you through the cleanup workflow.

## Structure

```
gmail-skill/
├── README.md
├── SKILL.md              # Main skill — workflow, best practices, organization guide
└── references/           # Playwright automation patterns (read on-demand)
    ├── archive-from-inbox.js
    ├── create-filter.js
    ├── create-label.js
    ├── delete-from-sender.js
    ├── edit-filter.js
    ├── hide-category-labels.js
    ├── list-labels.js
    ├── move-label.js
    ├── remove-label-from-emails.js
    ├── rename-label.js
    └── set-label-color.js
```

## Usage

Just ask Claude naturally:

- "Help me clean up my Gmail"
- "Audit my labels and filters"
- "Color all my labels with a nice palette"
- "Create a filter for newsletters"
- "Archive old emails from this sender"

## Notes

- Login is always manual — Claude will never handle your credentials
- Gmail's DOM uses non-standard elements (custom dropdowns, span-based links, hidden menus) — the reference files handle all of these quirks
- The skill recommends a label hierarchy and color scheme but adapts to your preferences
