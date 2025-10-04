import AdmZip from "adm-zip";
import {
  extAllowed,
  isLikelyBinary,
  safeUtf8,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
} from "./util";

export type RepoRef = { owner: string; repo: string; ref: string };

export function parseGitHubUrl(url: string): RepoRef {
  const u = new URL(url);
  if (u.hostname !== "github.com")
    throw new Error("Only github.com URLs are supported");
  const parts = u.pathname.replace(/^\/+/, "").split("/");
  if (parts.length < 2) throw new Error("URL must include /owner/repo");
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  let ref = "HEAD";
  const treeIdx = parts.findIndex((p) => p === "tree");
  if (treeIdx >= 0 && parts[treeIdx + 1]) ref = parts[treeIdx + 1];
  return { owner, repo, ref };
}

export async function fetchZipball(
  { owner, repo, ref }: RepoRef,
  token?: string
) {
  const url = `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(
    ref
  )}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "repo-docgen",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok)
    throw new Error(
      `GitHub download failed: ${res.status} ${await res.text()}`
    );
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

export type FileEntry = {
  path: string;
  content: string;
  lines: string[];
  size: number;
};

export function extractTextFiles(zipBuffer: Buffer): FileEntry[] {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const files: FileEntry[] = [];

  let total = 0;
  for (const e of entries) {
    if (e.isDirectory) continue;
    const path = e.entryName.replace(/^[^/]+\//, "");
    if (!extAllowed(path)) continue;
    const data = e.getData();
    if (data.length > MAX_FILE_BYTES) continue;
    if (isLikelyBinary(data)) continue;

    const content = safeUtf8(data);
    if (!content || content.trim().length === 0) continue;

    total += data.length;
    if (total > MAX_TOTAL_BYTES) break;

    files.push({
      path,
      content,
      lines: content.split(/\r?\n/),
      size: data.length,
    });
    if (files.length >= MAX_FILES) break;
  }
  return files;
}
