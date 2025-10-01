import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { ErrorObject } from "ajv";
import { DocPackSchema, DocPack } from "./schema";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL ?? "qwen3:8b";

// Setup AJV
const ajv = new Ajv2020({
  allErrors: true,
  strictSchema: false,
});
addFormats(ajv);

// Compile once
const validateDocPack = ajv.compile(DocPackSchema);

/** ---------- Type guards ---------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}
function isDocPackWrapper(o: unknown): o is { doc_pack: unknown } {
  return (
    isRecord(o) &&
    Object.keys(o).length === 1 &&
    Object.prototype.hasOwnProperty.call(o, "doc_pack")
  );
}

// Sanitizers for common LLM drifts
function ensureString(v: unknown, fallback = "Unknown"): string {
  return isString(v) ? v : fallback;
}

function sanitizeKeyComponents(
  v: unknown
): { name: string; description: string }[] {
  if (!isArray(v)) return [];
  const out: { name: string; description: string }[] = [];
  for (const item of v) {
    if (isString(item)) {
      out.push({ name: item, description: "Unknown" });
    } else if (isRecord(item)) {
      const name = ensureString(item.name, "Unknown");
      const description = ensureString(item.description, "Unknown");
      out.push({ name, description });
    }
  }
  return out;
}

function sanitizeCitationSources(
  v: unknown
): { path: string; start_line: number; end_line: number }[] {
  if (!isArray(v)) return [];
  const out: { path: string; start_line: number; end_line: number }[] = [];
  for (const item of v) {
    if (isString(item)) {
      out.push({ path: item, start_line: 1, end_line: 1 });
    } else if (isRecord(item)) {
      const path = ensureString(item.path, "Unknown");
      const start_line = isNumber(item.start_line) ? item.start_line : 1;
      const end_line = isNumber(item.end_line)
        ? item.end_line
        : Math.max(start_line, 1);
      out.push({ path, start_line, end_line });
    }
  }
  return out;
}

function sanitizeCitations(v: unknown): {
  section: string;
  sources: { path: string; start_line: number; end_line: number }[];
}[] {
  if (!isArray(v)) return [];
  const out: {
    section: string;
    sources: { path: string; start_line: number; end_line: number }[];
  }[] = [];
  for (const item of v) {
    if (isString(item)) {
      out.push({ section: item, sources: [] });
    } else if (isRecord(item)) {
      const section = ensureString(item.section, "Unknown");
      const sources = sanitizeCitationSources(item.sources);
      out.push({ section, sources });
    }
  }
  return out;
}

function sanitizeDocPackCandidate(o: unknown): unknown {
  if (!isRecord(o)) return o;

  // architecture.key_components: array of objects -> coerce strings to objects
  if (isRecord(o.architecture)) {
    const arch = o.architecture as Record<string, unknown>;
    if (arch.key_components !== undefined) {
      arch.key_components = sanitizeKeyComponents(arch.key_components);
    }
    // ensure overview is a string
    if (arch.overview !== undefined) {
      arch.overview = ensureString(arch.overview, "Unknown");
    }
  }

  // citations: array of objects -> coerce strings
  if (o.citations !== undefined) {
    o.citations = sanitizeCitations(o.citations);
  }

  // how_to_run: ensure nested arrays of strings
  if (isRecord(o.how_to_run)) {
    const htr = o.how_to_run as Record<string, unknown>;
    for (const k of ["prerequisites", "install_steps", "run_steps"] as const) {
      const val = htr[k];
      if (isArray(val)) {
        htr[k] = val.map((x) => ensureString(x)).filter((x) => x.length > 0);
      } else {
        htr[k] = [];
      }
    }
  }

  // tech_stack: ensure arrays of strings
  if (isRecord(o.tech_stack)) {
    const ts = o.tech_stack as Record<string, unknown>;
    for (const k of ["languages", "frameworks", "libraries"] as const) {
      const val = ts[k];
      if (isArray(val)) {
        ts[k] = val.map((x) => ensureString(x)).filter((x) => x.length > 0);
      } else {
        ts[k] = [];
      }
    }
  }

  // features, security_notes, limitations: arrays of strings
  for (const k of ["features", "security_notes", "limitations"] as const) {
    const val = (o as Record<string, unknown>)[k];
    if (isArray(val)) {
      (o as Record<string, unknown>)[k] = val
        .map((x) => ensureString(x))
        .filter((x) => x.length > 0);
    } else {
      (o as Record<string, unknown>)[k] = [];
    }
  }

  // summary: ensure strings
  if (isRecord(o.summary)) {
    const sum = o.summary as Record<string, unknown>;
    sum.name = ensureString(sum.name, "Unknown");
    sum.one_liner = ensureString(sum.one_liner, "Unknown");
    sum.description = ensureString(sum.description, "Unknown");
  }

  // meta: ensure required strings exist if present
  if (isRecord(o.meta)) {
    const m = o.meta as Record<string, unknown>;
    m.owner = ensureString(m.owner, "Unknown");
    m.repo = ensureString(m.repo, "Unknown");
    m.ref = ensureString(m.ref, "Unknown");
    m.generated_at_iso = ensureString(m.generated_at_iso, "Unknown");
    if (m.commit_sha !== undefined && !isString(m.commit_sha)) {
      delete m.commit_sha;
    }
  }

  return o;
}

// Helpers
function unwrapIfDocPack(o: unknown): unknown {
  return isDocPackWrapper(o) ? o.doc_pack : o;
}

function validate(json: unknown): {
  ok: boolean;
  errors?: ErrorObject[] | null;
} {
  const ok = validateDocPack(json) as boolean;
  return ok ? { ok: true } : { ok: false, errors: validateDocPack.errors };
}

// Build for the model
function buildSkeleton(meta: {
  owner: string;
  repo: string;
  ref: string;
  commit_sha?: string;
  generated_at_iso: string;
}): DocPack {
  return {
    meta: {
      owner: meta.owner,
      repo: meta.repo,
      ref: meta.ref,
      generated_at_iso: meta.generated_at_iso,
      ...(meta.commit_sha ? { commit_sha: meta.commit_sha } : {}),
    },
    summary: {
      name: "Unknown",
      one_liner: "Unknown",
      description: "Unknown",
    },
    features: [],
    how_to_run: {
      prerequisites: [],
      install_steps: [],
      run_steps: [],
    },
    tech_stack: {
      languages: [],
      frameworks: [],
      libraries: [],
    },
    architecture: {
      overview: "Unknown",
      key_components: [],
    },
    security_notes: [],
    limitations: [],
    citations: [],
  };
}

// Main
export async function callStructuredDocPackLLM(input: {
  meta: {
    owner: string;
    repo: string;
    ref: string;
    commit_sha?: string;
    generated_at_iso: string;
  };
  retrieved: {
    sectionKey: string;
    snippets: {
      filePath: string;
      startLine: number;
      endLine: number;
      text: string;
    }[];
  }[];
}): Promise<DocPack> {
  const system = `
You are a documentation generator. You must return ONLY a JSON object that VALIDATES against the provided JSON Schema.
Ground every statement ONLY in the provided snippets. If a detail is not present, use "Unknown" (strings) or [] (arrays).
DO NOT invent stack items, commands, or component names.
DO NOT change the structure, keys, or types of the provided SKELETON.
Arrays like architecture.key_components[] and citations[] MUST contain OBJECTS with the exact fields shown in the schema.
`.trim();

  const snippetsBlock = input.retrieved
    .map((r) => {
      const s = r.snippets
        .map(
          (sn) => `### ${sn.filePath}:${sn.startLine}-${sn.endLine}\n${sn.text}`
        )
        .join("\n\n");
      return `## Section: ${r.sectionKey}\n${s}`;
    })
    .join("\n\n---\n\n");

  const skeleton = buildSkeleton(input.meta);

  const user = `
JSON_SCHEMA:
${JSON.stringify(DocPackSchema, null, 2)}

REPO_META:
${JSON.stringify(input.meta, null, 2)}

SKELETON (valid DocPack object):
${JSON.stringify(skeleton, null, 2)}

SNIPPETS (read-only evidence):
${snippetsBlock}

TASK:
Return ONLY the SKELETON object with VALUES edited based on the SNIPPETS.
- Keep ALL keys, structure, and types EXACTLY as in SKELETON (do not wrap in "doc_pack", do not nest fields elsewhere).
- Arrays:
  - "architecture.key_components" MUST be an array of objects: { "name": string, "description": string }.
  - "citations" MUST be an array of objects: { "section": string, "sources": { "path": string, "start_line": number, "end_line": number }[] }.
- Fill strings/arrays using only information in SNIPPETS; use "Unknown" or [] when not present.
`.trim();

  // First attempt
  let first = await ollamaGenerateJson(system, user);
  first = unwrapIfDocPack(first);
  first = sanitizeDocPackCandidate(first);
  const valid1 = validate(first);
  if (valid1.ok) return first as DocPack;

  const repairPrompt = `
Your previous JSON did not validate. Ajv errors:
${JSON.stringify(valid1.errors, null, 2)}

Here is your previous output:
${JSON.stringify(first, null, 2)}

You MUST return ONLY the SKELETON with values edited. Do NOT change keys, structure, or types.
- "architecture.key_components" must be array of objects { "name": string, "description": string }.
- "citations" must be array of objects { "section": string, "sources": { "path": string, "start_line": number, "end_line": number }[] }.

SKELETON (valid DocPack object to edit):
${JSON.stringify(skeleton, null, 2)}
`.trim();

  let second = await ollamaGenerateJson(system, user + "\n\n" + repairPrompt);
  second = unwrapIfDocPack(second);
  second = sanitizeDocPackCandidate(second);
  const valid2 = validate(second);
  if (!valid2.ok) {
    throw new Error(
      "LLM returned invalid JSON twice. Errors: " +
        JSON.stringify(valid2.errors)
    );
  }
  return second as DocPack;
}

// Ollama wrapper
type OllamaGenerateResponse = { response: unknown };

async function ollamaGenerateJson(
  system: string,
  user: string
): Promise<unknown> {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      prompt: `System:\n${system}\n\nUser:\n${user}\n`,
      format: "json", // ask for pure JSON
      stream: false,
      options: {
        temperature: 0.2,
        // num_ctx: 8192, // uncomment if you need a larger context window
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM failed: ${res.status} ${text}`);
  }

  const j = (await res.json()) as OllamaGenerateResponse;
  const raw = j.response;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("LLM did not return valid JSON string");
    }
  }
  if (isRecord(raw)) return raw;

  throw new Error("LLM returned an unsupported response type");
}
