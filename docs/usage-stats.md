# Measuring WatDesk usage without analytics

WatDesk collects no telemetry (see PRIVACY.md), so usage numbers come from the platforms that distribute it.

1. **Microsoft Edge Add-ons Partner Center** → your extension → Analytics: installs, uninstalls, weekly active users, ratings. Screenshot it monthly; this is the number to quote.
2. **GitHub release downloads**: `gh api repos/Jelly-RayTian/WatDesk/releases --jq '.[] | {tag: .tag_name, downloads: ([.assets[].download_count] | add)}'`
3. **GitHub traffic** (repo → Insights → Traffic): views and clones, retained 14 days only, so record it periodically.
4. **Qualitative signal**: issues, store reviews and messages from classmates.

If per-feature usage ever becomes necessary, add it only as an explicit opt-in, update PRIVACY.md first, and keep it to anonymous counters with no course, grade or account data.
