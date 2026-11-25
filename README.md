# Focus Desk

A study timer, weekly plan and log. Run a focus session (15/25/45/60 min) for a subject, or log time by hand. Set a weekly goal per subject and see progress against it, minutes per day this week and your streak. Data stays in your browser (localStorage).

## Run / test
`python3 -m http.server`, then open http://localhost:8000. Tests: `npm test` (Node 18+).

## How it works
- `planner.js`: pure functions (validate and add sessions, weekly buckets, streak, time formatting).
- `app.js`: timer, form and drawing. Timer uses the end timestamp, so it stays accurate if the tab is throttled.
- `planner.test.js`: unit tests for the logic.

## Limits
The plan is weekly minute goals per subject; there is no hour-by-hour timetable yet.
Sessions only count when the timer finishes. No accounts or sync. Subjects are fixed in `planner.js`.

## Credits
Built with AI assistance.
