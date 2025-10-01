import { embedOne } from "./embed";
import { TOP_K } from "./util";

export type SectionQuery = {
  key: string;
  query: string;
};

export const SECTION_QUERIES: SectionQuery[] = [
  {
    key: "summary",
    query: "What does this project do? high-level purpose and one-liner.",
  },
  {
    key: "features",
    query: "List of notable features or capabilities from code and README.",
  },
  {
    key: "how_to_run",
    query: "How to install dependencies and run the app locally from files.",
  },
  {
    key: "tech_stack",
    query: "Languages, frameworks, libraries and tools used.",
  },
  {
    key: "architecture",
    query: "Architecture overview and key components/modules.",
  },
  {
    key: "security_notes",
    query: "Security and privacy considerations; secrets; unsafe patterns.",
  },
  {
    key: "limitations",
    query: "Known limitations, TODOs, and missing pieces.",
  },
];

export type Retrieved = {
  sectionKey: string;
  snippets: {
    filePath: string;
    startLine: number;
    endLine: number;
    text: string;
  }[];
};

export async function retrievePerSection(
  chunks: {
    filePath: string;
    startLine: number;
    endLine: number;
    text: string;
    embedding: number[];
  }[],
  topK: number = TOP_K
): Promise<Retrieved[]> {
  const results: Retrieved[] = [];
  for (const s of SECTION_QUERIES) {
    const qvec = await embedOne(s.query);
    const scored = chunks
      .map((c) => ({ c, score: dot(qvec, c.embedding) }))
      .sort((a, b) => b.score - a.score);

    // Diverse file paths
    const picked: Retrieved["snippets"] = [];
    const seen = new Set<string>();
    for (const { c } of scored) {
      if (picked.length >= topK) break;
      if (seen.has(c.filePath)) continue;
      picked.push({
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
        text: c.text,
      });
      seen.add(c.filePath);
    }
    results.push({ sectionKey: s.key, snippets: picked });
  }
  return results;
}

function dot(a: number[], b: number[]) {
  let s = 0,
    // eslint-disable-next-line prefer-const
    n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}
