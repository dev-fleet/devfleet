# DevFleet

**The open-source code reviewer for AI-generated pull requests.**

---

## The Problem

Your team adopted Cursor, Claude Code, or Amp. Velocity went up. But so did the time you spend in code review.

AI tools are great at generating working code—but they don't know your team's patterns. They miss your naming conventions, ignore your error-handling style, and introduce subtle inconsistencies that compound over time.

You're now the human guardrail catching style drift across dozens of PRs a week.

---

## The Solution

DevFleet is an open-source agent that reviews AI-generated pull requests and flags pattern drift with clear, actionable comments—before you even open the PR.

It understands your codebase conventions and points out when AI-generated code doesn't match:

- Inconsistent naming or file organization
- Missed abstractions your team already has
- Error handling that doesn't follow your patterns
- Style violations that slip past linters

Think of it as a senior engineer who's memorized your style guide and never gets tired.

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

**Example comment:**

> 💡 This creates a new `fetchUserData` helper, but `src/utils/api.ts` already exports `getUserById` which handles the same case with your team's retry logic. Consider using the existing abstraction.

---

## Open Source & Self-Hostable

DevFleet is fully open source under the AGPL license. You can run it on your own infrastructure with complete control over your data.

**Self-hosting takes about 15 minutes:**

→ Full self-hosting guide: [docs.devfleet.ai/self-hosting](https://docs.devfleet.ai/self-hosting)

---

## Early Access Cloud Offering

Don't want to self-host? We're building a managed cloud version with extra capabilities:

- **Pattern extraction** – We analyze your codebase and extract your team's conventions automatically
- **Tuned review rules** – Custom rules based on your actual code, not generic best practices
- **Priority support** – Direct line to the team building DevFleet

We're working with a small group of teams during early access.

**→ [Join the waitlist](https://devfleet.ai)**

---

## Quick Start (Local Development)

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
