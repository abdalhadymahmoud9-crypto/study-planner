# Focus Desk

A study timer, weekly plan and log. Run a focus session (15/25/45/60 min) for a subject, or log time by hand. Set a weekly goal per subject and see progress against it, minutes per day this week and your streak. Data stays in your browser (localStorage) unless you sign in. Optional Google sign-in (Firebase Auth + Firestore, free Spark plan) syncs your data to your own account only (rules: owner-only), merging changes instead of overwriting. Sync was checked in one browser profile and one Google account, not across two devices. This device keeps an unencrypted offline copy per account until you use "Remove offline copies" after signing out (copies with unsynced changes are kept).

## Run / test
`python3 -m http.server`, then open http://localhost:8000. Tests: `npm test` (Node 18+).

## How it works
- `planner.js`: pure functions (validate and add sessions, weekly buckets, streak, time formatting).
- `app.js`: timer, form and drawing. Timer uses the end timestamp, so it stays accurate if the tab is throttled.
- `planner.test.js`: unit tests for the logic.

## Limits
The plan is weekly minute goals per subject; there is no hour-by-hour timetable yet.
Sessions only count when the timer finishes. Subjects can be added in the app; defaults are in `planner.js`.

## Credits
Built with AI assistance.
