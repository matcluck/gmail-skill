# Gmail Workflows

Gmail workflow skills for Codex and Claude Code: labels, filters, inbox audits, rule audits, label colours, and safe cleanup.

## Install Shapes

This repo now supports two layouts:

- Plugin layout: `.codex-plugin/`, `.claude-plugin/`, and `skills/`
- Legacy single-skill layout: root `SKILL.md` plus `references/`

The plugin layout is the complete source for companion workflows:

- `gmail`
- `gmail-add-label`
- `gmail-add-rules`
- `gmail-audit-inbox`
- `gmail-audit-rules`
- `gmail-colour-labels`

The root `SKILL.md` mirrors the core `gmail` skill so older single-skill installs still get the current core Gmail rules and references.

## Safety Defaults

- Never automate Gmail login.
- Do not delete, mark read, unsubscribe, forward, or star unless explicitly asked.
- Use inbox-first rules by default: base/tag filters keep Inbox; skip filters are separate and never apply labels.
- Security, login, MFA, verification, account-protection, finance, health, bills, government, and human mail stay visible unless explicitly approved otherwise.
- Broad no-subject skip rules are only for dedicated mailing-list/newsletter senders or stable list IDs.

## Structure

```text
gmail-skill/
├── .codex-plugin/plugin.json
├── .claude-plugin/plugin.json
├── SKILL.md
├── references/
└── skills/
    ├── gmail/
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
