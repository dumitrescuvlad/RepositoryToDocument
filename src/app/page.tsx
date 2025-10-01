"use client";

import { useState } from "react";

type ApiResponse = {
  doc_pack: unknown;
  readme_markdown: string;
  readme_html: string;
  meta: { owner: string; repo: string; ref: string; commit_sha?: string };
};

export default function Page() {
  const [url, setUrl] = useState(
    "https://github.com/dumitrescuvlad/money-tracker"
  );
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResp(null);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as ApiResponse;
      setResp(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message ?? "Request failed");
      } else {
        setError("Request failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Repo → Docs</h1>
      <p>
        Paste a public GitHub URL (optionally with{" "}
        <code>/tree/&lt;branch-or-tag&gt;</code>).
      </p>

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", gap: 8, marginTop: 12 }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo or .../tree/main"
          style={{ flex: 1, padding: 10 }}
        />
        <button disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && (
        <div
          className="card"
          style={{ borderColor: "#fecaca", background: "#fff1f2" }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {resp && (
        <>
          <div className="card">
            <h2>README.md (rendered)</h2>
            <div dangerouslySetInnerHTML={{ __html: resp.readme_html }} />
          </div>
          <div className="card">
            <h2>README.md (raw)</h2>
            <pre>{resp.readme_markdown}</pre>
          </div>
          <div className="card">
            <h2>doc_pack (JSON)</h2>
            <pre>{JSON.stringify(resp.doc_pack, null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  );
}
