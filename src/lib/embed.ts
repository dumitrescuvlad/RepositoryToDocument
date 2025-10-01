import { cosine } from "./util";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export async function embedOne(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok)
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.embedding as number[];
}

export type Embedded<T> = T & { embedding: number[] };

export async function embedChunks<T extends { text: string }>(chunks: T[]) {
  const out: Embedded<T>[] = [];
  for (const c of chunks) {
    const embedding = await embedOne(c.text);
    out.push({ ...c, embedding });
  }
  return out;
}

export function topK<T extends { embedding: number[] }>(
  queryVec: number[],
  items: T[],
  k: number
) {
  return items
    .map((it) => ({ it, score: cosine(queryVec, it.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
