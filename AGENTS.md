# Agent Instructions — SIA_website

This repository is explicitly opted into the AI Knowledge Hub. These instructions apply **only here**, not in unrelated repositories or workspaces.

## Read before substantive work
- Read [PROJECT_MEMORY.md](PROJECT_MEMORY.md) for project context, then check relevant source code, docs, and tests to verify the current implementation.
- Read only task-relevant sources. Consult the private [AI Knowledge Hub](https://github.com/kypnicholas/ai-knowledge-hub) **only when cross-project context is necessary and available**. A URL alone does not confer access. Do not retrieve the hub in other projects.
- Current checked-in code and configuration supersede potentially stale memory.

## Project rules
- **Public repository:** only public-safe architectural and technical information may be committed. Never expose property-owner identities, private contact information, spreadsheet URLs, unpublished data or credentials.
- The website reads public `listings.json` in the browser. Do not undo the workflow's removal of `contactEmail` and `contactPhone` during sync.
- Preserve root `_config.yml` Jekyll exclusions for `AGENTS.md`, `PROJECT_MEMORY.md`, and other repository-only files. Check the Pages build/artifact before concluding they are not published.
- Keep the current HTML/CSS/JS and listing JSON format stable; never invent legal or property data.

## Maintaining memory
- After significant work, assess whether durable implementation facts, architectural decisions, deployment behavior, dependencies, contracts or next steps changed.
- If warranted, present a concise, evidence-backed proposed diff to `PROJECT_MEMORY.md` for approval; **never silently commit or push memory**. If no durable information changed, leave it alone.
- Do not include secrets, credentials, private runtime values, personal information or confidential client data. Keep the hub limited to explicitly approved cross-project knowledge; do not duplicate complete memories there.
