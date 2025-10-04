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
    return parts.length >= 2 && !!parts[0] && !!parts[1];
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
    const q = new URLSearchParams(window.location.search).get("url");
    if (q) setUrl(q);
    else {
      const last = localStorage.getItem("lastRepoUrl");
      if (last) setUrl(last);
    }
  }, []);

  const urlValid = useMemo(() => isLikelyGitHubRepoUrl(url), [url]);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
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
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-gray-200 bg-white shadow-sm">
          <span className="text-sm font-semibold">R</span>
        </div>
        <div>
          <h1 className="m-0 text-2xl font-semibold">
            Repository → Documentation
          </h1>
          <p className="m-0 text-sm text-gray-600">
            Upload your GitHub repo and get a documentation!
          </p>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={onSubmit} className="card p-3 mb-4">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
          />
          <button
            disabled={loading || !urlValid}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
        {!urlValid && url.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            Hint: try{" "}
            <code className="rounded bg-[#f6f8fa] px-1 border border-gray-200">
              https://github.com/owner/repo
            </code>{" "}
            or{" "}
            <code className="rounded bg-[#f6f8fa] px-1 border border-gray-200">
              .../tree/main
            </code>
          </p>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {resp && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="card p-4">
            <h2 className="mb-2 text-lg font-semibold">README (rendered)</h2>
            <div
              className="prose-gh"
              dangerouslySetInnerHTML={{ __html: resp.readme_html }}
            />
          </article>

          <article className="card p-4">
            <h2 className="mb-2 text-lg font-semibold">README (raw)</h2>
            <pre className="rounded-md border border-gray-200 bg-[#f6f8fa] p-3 text-sm text-gray-900 overflow-auto">
              {resp.readme_markdown}
            </pre>
          </article>

          <article className="card p-4 md:col-span-2">
            <h2 className="mb-2 text-lg font-semibold">doc_pack (JSON)</h2>
            <pre className="rounded-md border border-gray-200 bg-[#f6f8fa] p-3 text-sm text-gray-900 overflow-auto">
              {JSON.stringify(resp.doc_pack, null, 2)}
            </pre>
          </article>
        </section>
      )}
    </main>
  );
}
