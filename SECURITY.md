# Security Policy

## Supported versions

This is a personal/open-source project. Security fixes are applied to `main` as they are available.

## Reporting a vulnerability

If you believe you have found a security vulnerability, **do not open a public GitHub issue**.

Instead, contact the maintainers privately with:
- A clear description of the issue and impact
- Steps to reproduce (with any sensitive details sanitized)
- Any logs/screenshots with secrets removed

If the repository has GitHub “Private vulnerability reporting” enabled, use that. Otherwise, open a minimal issue asking for a secure contact channel.

## Secrets & keys

- **Never commit secrets** (API keys, tokens, credentials, `.env` files).
- Use `.env.example` as a template and store real values locally or in CI secret stores.
- If a secret is accidentally exposed, it must be **rotated/revoked immediately**.
