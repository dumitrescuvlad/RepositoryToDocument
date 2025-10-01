import { NextRequest, NextResponse } from "next/server";
import { parseGitHubUrl, fetchZipball, extractTextFiles } from "@/lib/github";
import { chunkAll } from "@/lib/chunk";
import { embedChunks } from "@/lib/embed";
import { retrievePerSection } from "@/lib/retrieve";
import { callStructuredDocPackLLM } from "@/lib/llm";
import { renderReadmeMd, markdownToHtml } from "@/lib/readme";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.url || typeof body.url !== "string") {
      return NextResponse.json(
        { error: "Missing 'url' string" },
        { status: 400 }
      );
    }

    // Validate/resolve URL
    const ref = parseGitHubUrl(body.url);
    const token = process.env.GITHUB_TOKEN;

    // Download zipball
    const zip = await fetchZipball(ref, token);

    // Extract + filter text files
    const files = extractTextFiles(zip);
    if (files.length === 0)
      throw new Error("No eligible text files found after filtering.");

    // Chunk + embed
    const chunks = chunkAll(files);
    const embedded = await embedChunks(chunks);

    // Retrieve top-K per section
    const retrieved = await retrievePerSection(embedded);

    // (Optional) Try to read HEAD commit sha via zip top folder name.
    const commitSha = undefined;

    // LLM structured output
    const meta = {
      owner: ref.owner,
      repo: ref.repo,
      ref: ref.ref,
      commit_sha: commitSha,
      generated_at_iso: new Date().toISOString(),
    };
    const doc_pack = await callStructuredDocPackLLM({ meta, retrieved });

    // Render README
    const readme_markdown = renderReadmeMd(doc_pack);
    const readme_html = markdownToHtml(readme_markdown);

    return NextResponse.json(
      { doc_pack, readme_markdown, readme_html, meta },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : "Internal error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
