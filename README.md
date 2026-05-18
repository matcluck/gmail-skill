# Gmail Workflows

Gmail workflow skills for Codex and Claude Code: labels, filters, inbox audits, rule audits, label colours, and safe cleanup.

## Install

Add the marketplace, then install the `gmail-workflows` plugin from that marketplace.

Codex:

```bash
codex plugin marketplace add matcluck/gmail-skill
```

For a local checkout:

```bash
codex plugin marketplace add /path/to/gmail-skill
```

Then open `/plugins`, select **Gmail Workflows**, and install `gmail-workflows`.

Claude Code:

```bash
claude plugin marketplace add matcluck/gmail-skill
claude plugin install gmail-workflows@gmail-workflows-marketplace
```

For a local checkout:

```bash
claude plugin marketplace add /path/to/gmail-skill
claude plugin install gmail-workflows@gmail-workflows-marketplace
```

## Install Shapes

The plugin layout is the source of truth:

- `.agents/plugins/marketplace.json` for Codex marketplace installation
- `.claude-plugin/marketplace.json` for Claude Code marketplace installation
- `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json` for plugin metadata
- `skills/` for the reusable workflow skills

- `gmail`
- `gmail-add-label`
- `gmail-add-rules`
- `gmail-audit-inbox`
- `gmail-audit-rules`
- `gmail-colour-labels`

The core `gmail` skill owns the shared references under `skills/gmail/references/`. Companion skills reference that path directly so Gmail rules, browser helpers, and cleanup behavior are maintained in one place.

## Safety Defaults

- Never automate Gmail login.
- Do not delete, mark read, unsubscribe, forward, or star unless explicitly asked.
- Use inbox-first rules by default: base/tag filters keep Inbox; skip filters are separate and never apply labels.
- Security, login, MFA, verification, account-protection, finance, health, bills, government, and human mail stay visible unless explicitly approved otherwise.
- Broad no-subject skip rules are only for dedicated mailing-list/newsletter senders or stable list IDs.

## Structure

```text
gmail-skill/
├── .agents/plugins/marketplace.json
├── .codex-plugin/plugin.json
├── .claude-plugin/
│   ├── marketplace.json
│   └── plugin.json
└── skills/
    ├── gmail/
    │   └── references/
    ├── gmail-add-label/
    ├── gmail-add-rules/
    ├── gmail-audit-inbox/
    ├── gmail-audit-rules/
    └── gmail-colour-labels/
```

## Review

After syncing local changes, review with:

```bash
git status --short
git diff
```
