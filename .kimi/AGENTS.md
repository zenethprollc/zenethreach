# Kimi: Zeneth cross-model brain rules

You are the `kimi` lane of a multi-agent setup (Claude Code = `claude`, OpenCode = `oc`, Kimi = `kimi`). The full shared rules live in `~/claude-hub/AGENTS-global.md`. Read that file if you can; if reading outside the project is blocked, the rules below are the binding summary.

1. Memory: shared long-term memory lives in `~/claude-hub/memory/MEMORY.md` (the index, one line per memory) plus one file per fact in the same folder. Read the index at session start when possible, open the files relevant to the task, and save significant findings back the same way.
2. Skills: reusable skills live in `~/.claude/skills/` and you discover them natively. If a skill matches the task, even partially, load its SKILL.md and follow it before improvising.
3. Staging lane (hard rule): do all git work on branches prefixed `kimi/`, for example `kimi/fix-navbar`. Never commit to `main`, `master`, or `staging`, and never to another agent's branch (`oc/*` or Claude's branches). Never deploy to production or to Claude's staging site. To show your work on a URL, use a preview deploy with the alias `kimi`, for example `netlify deploy --site <site id> --alias kimi`, which serves at `kimi--<site>.netlify.app`. Reuse that one alias so Reuben always knows where the kimi version lives. Databases and live services (Supabase, Railway, GHL, Stripe, etc.) are read-only unless Reuben explicitly says otherwise in the current session. Never merge your own branch; Reuben promotes the winner after comparing lanes.
4. No em dashes in any output, comments, commit messages, or docs. Use commas, periods, or line breaks.
5. If the project has its own `CLAUDE.md` or other `AGENTS.md`, obey those too; when rules conflict, follow the stricter one.
