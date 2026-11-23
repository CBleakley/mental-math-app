# M1-03 Deploy pipeline to Netlify

- **Status:** in progress
- **Wave:** 2
- **Depends on:** M1-01
- **Unblocks:** iPhone checks in M1-04 and M1-05; M1-11

## Goal

Every push to main is live on an HTTPS URL that opens on the iPhone.

## Scope

- Netlify site linked to the GitHub repo (free tier).
- Expo web export as the build.
- HTTPS, which Safari needs for microphone access.

## Done when

- [ ] The placeholder page loads in Safari on the iPhone from the Netlify URL after a push to main.

## Setup (one-off, in the Netlify dashboard)

The repo side is in `netlify.toml` (build `npm run build:web`, publish `dist`, Node 24, SPA fallback). To link the site:

1. Netlify → Add new site → Import an existing project → GitHub → `CBleakley/mental-math`.
2. Branch to deploy: `main`. Leave build settings blank; Netlify reads them from `netlify.toml`.
3. Deploy, then open the `*.netlify.app` URL (HTTPS by default) in Safari on the iPhone.

Status stays `in progress` until the placeholder page is confirmed on the iPhone.
