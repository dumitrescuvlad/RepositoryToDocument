export const MAX_FILES = 200;
export const MAX_FILE_BYTES = 500_000;
export const MAX_TOTAL_BYTES = 10_000_000;
export const CHUNK_SIZE = 1200;
export const CHUNK_OVERLAP = 200;
export const TOP_K = 6;
export const RUNTIME = "nodejs" as const;

export function isLikelyBinary(buf: Buffer) {
  const len = Math.min(buf.length, 1024);
  let nul = 0;
  for (let i = 0; i < len; i++) if (buf[i] === 0) nul++;
  return nul > 0 || !buf.toString("utf8").includes("\n");
}

export function extAllowed(path: string) {
  const lower = path.toLowerCase();
  const badDirs = [
    "node_modules",
    ".git/",
    ".github/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
  ];
  if (badDirs.some((d) => lower.includes(d))) return false;

  const exts = [
    ".md",
    ".txt",
    ".json",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".env.example",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".kt",
    ".rb",
    ".go",
    ".rs",
    ".php",
    ".c",
    ".h",
    ".cpp",
    ".cs",
    ".sql",
    ".sh",
    ".ps1",
    ".bat",
    ".gradle",
    ".xml",
    ".ipynb",
  ];
  return exts.some((e) => lower.endsWith(e));
}

export function safeUtf8(b: Buffer) {
  try {
    return b.toString("utf8");
  } catch {
    return "";
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function cosine(a: number[], b: number[]) {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
