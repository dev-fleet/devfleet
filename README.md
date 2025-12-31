[![](assets/github-header.jpg)](https://www.devfleet.ai)

<p align="center">
  <a href="https://www.devfleet.ai">
    <h1 align="center">DevFleet – Repository Automation Tools</h1>
  </a>
  <p align="center">
    Automate your repository tasks like reviewing PRs, triaging issues, or writing weekly team reports. Fully open source, using your favorite coding agent.
    <br />
    <a href="https://www.devfleet.ai">Website</a>
    ·
    <a href="https://www.getinboxzero.com/discord">Discord</a>
    ·
    <a href="https://github.com/dev-fleet/devfleet/issues">Issues</a>
  </p>
</p>

## The Problem

Your team adopted Cursor, Claude Code, or Amp. Velocity went up. But so did the time you spend on code reviews.

AI tools are great at generating working code, but they don’t know your team’s patterns. They miss your naming conventions, ignore your error-handling style, and introduce subtle inconsistencies that compound over time.

You’re now the human guardrail, catching style drift across dozens of PRs each week.

---

## The Solution

DevFleet is an open-source agent that reviews AI-generated pull requests and flags pattern drift with clear, actionable comments.

It understands your codebase conventions and points out when AI-generated code doesn’t match:

- Inconsistent naming or file organization
- Missed abstractions your team already uses
- Error handling that doesn’t follow your patterns
- Style violations that slip past linters

Think of it as a senior engineer who’s memorized your style guide and never gets tired.

---

## How It Works

```
1. AI agent opens a PR
      ↓
2. DevFleet receives the webhook
      ↓
3. Reviews the diff against your patterns
      ↓
4. Posts inline comments on style drift
      ↓
5. You review with context, not guesswork
```

---

## Getting Started

We offer a hosted version of DevFleet at [https://www.devfleet.ai](https://www.devfleet.ai).

### Local Development

You can find the full self-hosting guide here: [docs.devfleet.ai/self-hosting](https://docs.devfleet.ai/self-hosting)

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/dev-fleet/devfleet.git
   cd devfleet && pnpm install
   ```

2. Set up environment variables:

   ```bash
   cp apps/web/.env.example apps/web/.env
   ```

3. Create a [GitHub App](https://github.com/settings/apps/new) with:
   - **Permissions:** Contents, Issues, Pull requests, Checks (Read & Write)
   - **Events:** Issue comment, Issues, Pull request

4. Add your API keys to `.env`:
   - `GITHUB_APP_*` credentials
   - `ANTHROPIC_API_KEY`
   - `E2B_API_KEY`

5. Start the database and app:

   ```bash
   npm run db:docker:up
   npm run db:migrate
   npm run dev
   ```

6. Open [http://localhost:3001](http://localhost:3001)

---

## Contributing

We welcome contributions! Whether it's bug fixes, new features, or documentation improvements.

---

**Built by engineers who got tired of reviewing AI drift.**

Questions? [Open an issue](https://github.com/dev-fleet/devfleet/issues) or reach out on [Twitter/X](https://twitter.com/muratsutunc).
