import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    const deliveryId = request.headers.get("x-github-delivery");

    console.log("GitHub App webhook received:", {
      event,
      deliveryId,
      signature: signature ? "present" : "missing",
    });

    // TODO: Implement webhook signature verification
    // You'll need to verify the webhook signature using your GitHub App's webhook secret
    // const isValid = await verifyWebhookSignature(body, signature, process.env.GITHUB_APP_WEBHOOK_SECRET);
    // if (!isValid) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const payload = JSON.parse(body);

    switch (event) {
      case "installation":
        await handleInstallationEvent(payload);
        break;
      case "installation_repositories":
        await handleInstallationRepositoriesEvent(payload);
        break;
      case "repository":
        await handleRepositoryEvent(payload);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GitHub App webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleInstallationEvent(payload: any) {
  const { action, installation, repositories } = payload;

  console.log("Installation event:", {
    action,
    installationId: installation.id,
    account: installation.account.login,
    repositoryCount: repositories?.length || 0,
  });

  // TODO: Implement installation handling
  // When a user installs the GitHub App:
  // 1. Store the installation ID
  // 2. Link it to the user's organization
  // 3. Store initial repository access
  // 4. Fetch and store repository data using the installation access token

  switch (action) {
    case "created":
      console.log("App installed for:", installation.account.login);
      // TODO: Link installation to organization and store repositories
      break;
    case "deleted":
      console.log("App uninstalled for:", installation.account.login);
      // TODO: Remove installation and repository access
      break;
    case "suspend":
      console.log("App suspended for:", installation.account.login);
      // TODO: Mark installation as suspended
      break;
    case "unsuspend":
      console.log("App unsuspended for:", installation.account.login);
      // TODO: Mark installation as active
      break;
  }
}

async function handleInstallationRepositoriesEvent(payload: any) {
  const { action, installation, repositories_added, repositories_removed } =
    payload;

  console.log("Installation repositories event:", {
    action,
    installationId: installation.id,
    account: installation.account.login,
    repositoriesAdded: repositories_added?.length || 0,
    repositoriesRemoved: repositories_removed?.length || 0,
  });

  // TODO: Implement repository access changes
  // When repositories are added/removed from the installation:
  // 1. Add new repositories to the database
  // 2. Remove repositories that are no longer accessible
  // 3. Update organization-repository relationships

  switch (action) {
    case "added":
      console.log(
        "Repositories added:",
        repositories_added?.map((r: any) => r.full_name)
      );
      // TODO: Store newly added repositories
      break;
    case "removed":
      console.log(
        "Repositories removed:",
        repositories_removed?.map((r: any) => r.full_name)
      );
      // TODO: Remove repository access
      break;
  }
}

async function handleRepositoryEvent(payload: any) {
  const { action, repository, installation } = payload;

  console.log("Repository event:", {
    action,
    repository: repository.full_name,
    installationId: installation?.id,
  });

  // TODO: Implement repository changes
  // When repository metadata changes:
  // 1. Update repository information in the database
  // 2. Handle repository renames, transfers, etc.

  switch (action) {
    case "created":
      console.log("Repository created:", repository.full_name);
      // TODO: Add new repository to database
      break;
    case "deleted":
      console.log("Repository deleted:", repository.full_name);
      // TODO: Remove repository from database
      break;
    case "renamed":
      console.log("Repository renamed:", repository.full_name);
      // TODO: Update repository name in database
      break;
    case "transferred":
      console.log("Repository transferred:", repository.full_name);
      // TODO: Update repository ownership
      break;
  }
}
