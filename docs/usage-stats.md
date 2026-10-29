# Measuring WatDesk usage

Store install numbers come from distribution platforms. The optional usage counter estimates active installations only among users who opt in (see PRIVACY.md).

1. **Microsoft Edge Add-ons Partner Center** → your extension → Analytics: installs, uninstalls, weekly active users, ratings. Screenshot it monthly; this is the number to quote.
2. **GitHub release downloads**: `gh api repos/Jelly-RayTian/WatDesk/releases --jq '.[] | {tag: .tag_name, downloads: ([.assets[].download_count] | add)}'`
3. **GitHub traffic** (repo → Insights → Traffic): views and clones, retained 14 days only, so record it periodically.
4. **Qualitative signal**: issues, store reviews and messages from classmates.

If per-feature usage ever becomes necessary, add it only as an explicit opt-in, update PRIVACY.md first, and keep it to anonymous counters with no course, grade or account data.

## Optional anonymous counter (available, off by default)

WatDesk 1.9.0 uses the Cloudflare Worker at `https://watdesk-stats.guojelly123.workers.dev/ping`. Nothing is sent until the user explicitly enables the Settings option. The server stores random installation IDs and versions, never academic records. These counts are not total users or store installs. Deployment instructions are in `stats-worker/README.md`; the privacy text is in `PRIVACY.md`. The Edge Add-ons data-collection disclosure must describe this optional count.
