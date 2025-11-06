import { RepoDetailClient } from "./RepoDetailClient";

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;
  return <RepoDetailClient repoId={repoId} />;
}
