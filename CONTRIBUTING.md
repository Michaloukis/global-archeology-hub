# Contributing

Thanks for your interest in contributing to **Global Archaeology Hub**.

## Ground rules

- **No secrets in commits**: never commit `.env` files, API keys, tokens, credentials, or private URLs.
- **Keep archaeology data safe**: do not submit real sensitive site coordinates, private excavation data, or personal data.
- **Be respectful**: follow the Code of Conduct.

## Development setup (web)

Prereqs: Node.js (LTS recommended).

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a local env file:
   ```bash
   cp .env.example .env
   ```
   Fill in your values (see `README.md`).

3. Start dev server:
   ```bash
   npm run dev
   ```

## Development setup (mobile)

See `mobile/README.md` (Expo).

## Pull requests

- Use small, focused PRs.
- Include a clear description and screenshots/screen recordings for UI changes.
- Call out any data model / Supabase migration changes.
- Confirm you did **not** add secrets.

## Reporting bugs / requesting features

Please use GitHub issues and include:
- What you expected vs what happened
- Steps to reproduce
- Environment info (OS, browser/device, app version)

If it’s security-related, follow `SECURITY.md` instead.
