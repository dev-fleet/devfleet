## How to set up locally

1. `cp .env.example .env`
1. Create a new GitHub App: https://github.com/settings/apps/new
   1. Name: anything you like
   1. Homepage URL: http://localhost:3001
   1. Callback URL: http://localhost:3001/api/github-app/callback
   1. Check "Request user authorization (OAuth) during installation"
   1. Webhook URL: https://example.com
   1. Permissions:
      - Repository permissions:
        - Contents: Read and Write
        - Issues: Read and Write
        - Pull requests: Read and Write
      - Subscribe to events:
        - Issue comment
        - Issues
        - Pull request
   1. Set in .env: `GITHUB_APP_ID=<App ID>`
   1. Set in .env: `GITHUB_APP_CLIENT_ID=<Client ID>`
   1. Click "Generate a client secret", copy it
   1. Set in .env: `GITHUB_APP_CLIENT_SECRET=<client secret>`
   1. Click "Generate a private key", download the .pem file
   1. Set in .env: `GITHUB_APP_PRIVATE_KEY=` the output of `npx base64key ~/Downloads/key.pem | pbcopy`
1. Create a new OAuth app: https://github.com/settings/applications/new
   1. Name: anything you like
   1. Homepage URL: http://localhost:3001
   1. Authorization callback URL: http://localhost:3001/api/auth/callback/github
   1. Set in .env: `AUTH_GITHUB_ID=<Client ID>`
   1. Set in .env: `NEXT_PUBLIC_AUTH_GITHUB_ID=<Client ID>`
   1. Set in .env: `AUTH_GITHUB_SECRET=<Client Secret>`
1. Set in .env: `NEXT_PUBLIC_GITHUB_APP_INSTALL_URL=https://github.com/apps/<your oauth app name>/installations/new`
1. Set in .env: `BETTER_AUTH_SECRET=` to `openssl rand -base64 32 | pbcopy`
1. Set in .env: `OPENAI_API_KEY=` to a new key https://platform.openai.com/settings/organization/api-keys
1. Set in .env: `E2B_API_KEY=` to a new key https://e2b.dev/
1. Set in .env: `ENCRYPTION_KEY=` to `openssl rand -base64 32 | pbcopy`
1. `npm install -g pnpm`
1. `pnpm install`
1. `npm run db:migrate`
1. `npm run db:docker:up`
1. `npm run dev`
1. `npx --yes inngest-cli@latest dev` in a separate terminal
1. Open http://localhost:3001

## E2B

In order to build/update e2b dockerimage, run:
e2b template build

## Environment Keys

## Encryption Key

Generate this key using `openssl rand -base64 32`

## Github App Private Key

You need to download the pem file from the github application settings and run the following command to get the base64 encoded private key `npx base64key filename.pem | pbcopy`.

## Making Database Related Changes

When you make some changes on the `schema.ts`, it's important to create migrations. When working locally, you can run `npm run db:dev:push` to make sure your local database matches the table descriptions in the schema file. Once you verify the changes, you can create the SQL migrations by running `npm run db:dev:generate`. This will generate a new file under the db/migrations folder. After this file is created, you can apply the migration by running `npm run db:migrate`. We currently dont have an automated way to applying new database migrations, you need to apply them manually by running the script.

