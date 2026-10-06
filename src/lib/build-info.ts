import "server-only";
import packageInfo from "../../package.json";

export function formatBuildInfo(release: string, commit?: string): string {
  const build = commit && /^[a-f0-9]{7,40}$/i.test(commit)
    ? `build ${commit.slice(0, 7)}` : "local build";
  return `v${release} · ${build}`;
}
export function getBuildInfo(): string {
  return formatBuildInfo(packageInfo.version, process.env.VERCEL_GIT_COMMIT_SHA);
}
