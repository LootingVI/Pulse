# Contributing to Pulse

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/LootingVI/pulse.git
cd pulse
npm install
cp .env.example .env
# Edit .env with your NEXTAUTH_SECRET
npx prisma migrate dev
npm run dev
```

## Branch Naming

| Type | Pattern |
|---|---|
| Feature | `feature/short-description` |
| Bug fix | `fix/short-description` |
| Docs | `docs/short-description` |

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Add screenshots for UI changes
- Make sure `npm run build` passes without errors

## Reporting Bugs

Open a GitHub Issue with:
1. Steps to reproduce
2. Expected vs actual behavior
3. Your OS, Node version, and browser

## Feature Requests

Open a GitHub Discussion describing your use case before opening a PR for large features.

## Code Style

- TypeScript strict mode is enabled — no `any` unless absolutely necessary
- Use existing UI components from `src/components/ui/`
- Follow the existing file structure in `src/app/`
