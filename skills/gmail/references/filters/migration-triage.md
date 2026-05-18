# Filter Migration Triage

When auditing existing Gmail filters, classify each one by what action (if any) it needs. Use the JSON output of `../core/dump-state.js → DUMP_FILTERS` as input.

## Classification logic

Run this against each filter in the dump:

```js
function classifyFilter(f) {
  if (f.markAsRead) return { action: 'FIX', reason: 'filters must never mark mail as read' };

  // Pure label-only — already inbox-first, no action
  if (!f.skipInbox && !f.delete && !f.markAsRead) return { action: 'KEEP', reason: 'already inbox-first' };

  // Delete-it filters — usually one-off, leave alone
  if (f.delete) return { action: 'KEEP', reason: 'explicit delete action — review manually if stale' };

  // Forward filters — special, never auto-migrate
  if (f.forward) return { action: 'KEEP', reason: 'has forward action — special-case' };

  // Subject-constrained transactional filters — leave alone
  // (for example, subject-constrained statements, receipts, or confirmations)
  if (f.criteria.subject) {
    const transactional = /receipt|invoice|statement|contract|payment|order|confirmation|shipped|delivered|tax/i;
    if (transactional.test(f.criteria.subject)) {
      return { action: 'KEEP', reason: 'subject-constrained transactional' };
    }
    // Subject-constrained non-transactional — could create a companion-only filter
    return { action: 'COMPANION_ONLY', reason: 'subject-constrained — add companion archive filter without altering this one' };
  }

  // Pure-noise senders — keep archiving (job alerts, newsletters, and digest-only lists)
  const fromStr = (f.criteria.from || '').toLowerCase();
  const pureNoise = [
    'jobalerts', 'jobs-listings', 'jobs-noreply', 'job-alerts',
    'no-reply@account.', 'noreply@account.',  // pure account notices
    'digest.example.org',  // mailing list digest only
  ];
  if (pureNoise.some(p => fromStr.includes(p))) {
    return { action: 'KEEP_ARCHIVE', reason: 'pure-noise sender — keep current skip-inbox behaviour' };
  }

  // Pure-transactional (login codes, OTP)
  const txOnly = ['otp', 'verification', 'login-code', 'login_code', 'passcode'];
  if (txOnly.some(p => fromStr.includes(p))) {
    return { action: 'KEEP_ARCHIVE', reason: 'pure-transactional — keep skip inbox' };
  }

  // Default: skip-inbox + label → migrate to inbox-first two-filter pattern
  if (f.skipInbox && f.label) {
    return { action: 'MIGRATE', reason: 'mixed-importance sender — convert to inbox-first two-filter' };
  }

  return { action: 'REVIEW', reason: 'unclassified — needs human review' };
}
```

## Triage outputs

After running the classifier, group filters by action:

```js
const dump = /* DUMP_FILTERS result */;
const groups = { FIX: [], MIGRATE: [], KEEP: [], KEEP_ARCHIVE: [], COMPANION_ONLY: [], REVIEW: [] };
for (const f of dump) {
  const { action, reason } = classifyFilter(f);
  groups[action].push({ ...f, _reason: reason });
}
```

## What to do with each group

| Group | Action | How |
|---|---|---|
| **FIX** | Remove `Mark as read`; no filter may mark mail read | Edit existing filter actions |
| **MIGRATE** | Convert to inbox-first two-filter pattern | `retrofit-archive-everything.md` Pattern 2 (batch eval, 1 call per ~6 senders) |
| **KEEP** | Do nothing | — |
| **KEEP_ARCHIVE** | Do nothing — current behaviour is correct | — |
| **COMPANION_ONLY** | Add a companion `from + safe keywords → skip inbox only` filter without editing the existing one | Custom eval — see subject-constrained example in `retrofit-archive-everything.md` |
| **REVIEW** | Surface to user with sender + criteria + actions, ask for decision | Interview-style |

## Example output

For a large filter dump, the classifier might produce:

| Group | Count | Examples |
|---|---|---|
| MIGRATE | many | Mixed transactional/promotional senders |
| KEEP | some | Label-only alerts or already-correct filters |
| KEEP_ARCHIVE | some | Job alerts, digest newsletters, pure-noise senders |
| COMPANION_ONLY | few | Subject-constrained transactional filters |
| REVIEW | few | Ambiguous shared platform domains |

This decision happens up-front in a small deterministic classifier instead of a long reasoning loop over every filter.

## When to run the triage

- At the start of any "clean up my filters" or "audit and improve" task
- After a long break in the session (filters may have changed)
- Before kicking off a Pattern 2 batch — confirms the sender list is correct

## Output format for the user

When presenting triage results to the user, group by action and show counts:

```
Found N filters. Triage:
- many to migrate to inbox-first
- some already correctly label-only
- some pure noise, keep archiving
- few subject-constrained, companion filter only
- few need action hygiene fixes
- few need review
```

This lets the user confirm the plan in one glance instead of being walked through each filter.
