# Browser Use Smoke Test

Use this when validating the skill in Codex Desktop with the Browser Use plugin.

Browser Use is useful for checking Gmail navigation and visible UI contracts. It does not expose page-level `evaluate`, so it cannot run the JavaScript snippets in `core/healthcheck.js`, `filters/create-filter.js`, or `filters/edit-filter.js` directly.

## What This Validates

- Browser Use can navigate to Gmail settings pages.
- The user is signed in.
- Gmail's labels settings page exposes the expected label-management controls.
- Gmail's filters settings page exposes the expected filter-management controls.
- The create-filter dialog exposes the expected criteria fields.

## Non-Destructive Flow

1. Navigate to `https://mail.google.com/mail/u/0/#settings/labels`.
2. Confirm `Create new label` appears exactly once.
3. Confirm `Show in label list` appears.
4. Navigate to `https://mail.google.com/mail/u/0/#settings/filters`.
5. Confirm `Create a new filter` appears exactly once.
6. Confirm `Import filters` appears.
7. Click `Create a new filter`.
8. Confirm these labels each resolve once:
   - `From`
   - `To`
   - `Subject`
   - `Has the words`
   - `Doesn't have`
9. Navigate back to labels settings to discard the unsaved dialog.

Do not type into fields or submit the form during this smoke test.

## Expected Result

The smoke test passes when each required label/filter control is visible and uniquely identifiable enough for the automation flow. Record failures as generic selector issues in the relevant reference file; do not append dated run logs to this smoke-test document.
