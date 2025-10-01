import { CHUNK_SIZE, CHUNK_OVERLAP } from "./util";

export type Chunk = {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  text: string;
};

export function chunkFile(filePath: string, lines: string[]): Chunk[] {
  const joined = lines.join("\n");
  const chunks: Chunk[] = [];
  let i = 0,
    startChar = 0;
  while (startChar < joined.length) {
    const endChar = Math.min(joined.length, startChar + CHUNK_SIZE);
    const slice = joined.slice(startChar, endChar);

    const pre = joined.slice(0, startChar);
    const startLine = pre.split("\n").length;
    const endLine = (pre + slice).split("\n").length;
    chunks.push({
      id: `${filePath}:${startLine}-${endLine}:${i++}`,
      filePath,
      startLine,
      endLine,
      text: slice,
    });
    if (endChar >= joined.length) break;
    startChar = endChar - CHUNK_OVERLAP;
  }
  return chunks;
}

export function chunkAll(files: { path: string; lines: string[] }[]) {
  return files.flatMap((f) => chunkFile(f.path, f.lines));
}
