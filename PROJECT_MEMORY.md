# Project Memory — SIA_website

> Assessed 2026-11-09 against repository `main` commit `860f2eb0249b8db3e4f380044ce2933d178df6e8`. This document describes verified source-controlled behavior, not a guarantee about external service settings or live deployment. When in doubt, inspect current code and deployment configuration.

## Purpose and audience

A public, static property-listings website for Cyprus plots, designed to display publicly approved listings while avoiding disclosure of private owner contact information. This GitHub repository is **public**; its agent documentation must be public-safe.

## Implementation

- Main page: [`index.html`](index.html); listing functionality and shortlist/PDF interactions: [`scripts.js`](scripts.js); styles: [`styles.css`](styles.css).
- Public listing feed: [`listings.json`](listings.json), consumed by browser JavaScript. Listing image assets live in `listing_images/`; branding/site images are in `website_images/`.
- Informational and legal presentation is in [`disclaimer.html`](disclaimer.html); do not treat its content as legal advice.
- Favorites/shortlisting use browser local storage. The frontend uses browser-side PDF libraries for exporting printable listings (see `scripts.js`).
- No frontend bundler or automated application test suite was identified.

## Data refresh

- [`.github/workflows/sync-listings.yaml`](.github/workflows/sync-listings.yaml) runs on a daily UTC schedule or manual dispatch, obtains a JSON feed from a repository secret, validates an array, deletes private contact fields `contactEmail` and `contactPhone`, and commits changed public `listings.json`.
- The remote data source address and any sensitive spreadsheet details are **not** recorded here. Changes to data structure must preserve existing site rendering and privacy filtering.

## Publishing and local checks

- GitHub Pages uses Jekyll branch publishing; [`_config.yml`](_config.yml) explicitly excludes the root AI agent/memory files and repository-only folders from the generated site. The safeguard commit's Pages deployment succeeded, but the exclusion should still be rechecked after these files are introduced.
- Serve the root with `python -m http.server 8000` and inspect listing rendering, filters, shortlist storage, PDF export, images, and disclaimers.
- Confirm Pages build status after memory commits and inspect the live website for regressions and unwanted document exposure.

## Guardrails and open questions

- Never put owner identities, emails, numbers, internal URLs, secrets or unapproved listings into public source-controlled memory.
- The published JSON is not a place to preserve removed contact fields.
- Verify current GitHub Pages site origin and settings when modifying publishing; a successful build alone does not prove every published path is excluded.

## Memory maintenance

Treat this as a durable, concise navigation map rather than a work diary. Verify any claim against the relevant source files before acting. Propose changes for approval when implementation contracts, architecture or deployment behavior change. Never copy secrets, private user data or runtime records into this file.
