"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResponse = {
  doc_pack: unknown;
  readme_markdown: string;
  readme_html: string;
  meta: { owner: string; repo: string; ref: string; commit_sha?: string };
};

function isLikelyGitHubRepoUrl(u: string) {
  try {
    const url = new URL(u);
    if (url.hostname !== "github.com") return false;
    const parts = url.pathname.replace(/^\/+/, "").split("/");

    if (parts.length < 2) return false;
    return Boolean(parts[0] && parts[1]);
  } catch {
    return false;
  }
}

export default function Page() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("url");
    if (q) {
      setUrl(q);
      return;
    }
    const last = localStorage.getItem("lastRepoUrl");
    if (last) setUrl(last);
  }, []);

  const urlValid = useMemo(() => isLikelyGitHubRepoUrl(url), [url]);

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!urlValid) return;

    setLoading(true);
    setError(null);
    setResp(null);

    try {
      localStorage.setItem("lastRepoUrl", url);
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as ApiResponse;
      setResp(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Repo → Docs</h1>
      <p>
        Paste any public GitHub URL (optionally with{" "}
        <code>/tree/&lt;branch-or-tag&gt;</code>), then generate docs.
      </p>

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", gap: 8, marginTop: 12 }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value.trim())}
          placeholder="https://github.com/owner/repo  (or  .../tree/main)"
          style={{ flex: 1, padding: 10 }}
        />
        <button
          disabled={loading || !urlValid}
          style={{ padding: "10px 14px" }}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {!urlValid && url.length > 0 && (
        <div
          className="card"
          style={{ borderColor: "#fde68a", background: "#fffbeb" }}
        >
          <strong>Hint:</strong> expected something like{" "}
          <code>https://github.com/owner/repo</code> or{" "}
          <code>.../tree/main</code>.
        </div>
      )}

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
