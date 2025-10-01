export const DocPackSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/doc_pack.schema.json",
  type: "object",
  required: [
    "meta",
    "summary",
    "features",
    "how_to_run",
    "tech_stack",
    "architecture",
    "security_notes",
    "limitations",
  ],
  additionalProperties: false,
  properties: {
    meta: {
      type: "object",
      required: ["owner", "repo", "ref", "generated_at_iso"],
      additionalProperties: false,
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        ref: { type: "string" },
        commit_sha: { type: "string" },
        generated_at_iso: { type: "string", format: "date-time" },
      },
    },
    summary: {
      type: "object",
      required: ["name", "one_liner", "description"],
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        one_liner: { type: "string" },
        description: { type: "string" },
      },
    },
    features: { type: "array", items: { type: "string" } },
    how_to_run: {
      type: "object",
      required: ["prerequisites", "install_steps", "run_steps"],
      additionalProperties: false,
      properties: {
        prerequisites: { type: "array", items: { type: "string" } },
        install_steps: { type: "array", items: { type: "string" } },
        run_steps: { type: "array", items: { type: "string" } },
      },
    },
    tech_stack: {
      type: "object",
      required: ["languages", "frameworks", "libraries"],
      additionalProperties: false,
      properties: {
        languages: { type: "array", items: { type: "string" } },
        frameworks: { type: "array", items: { type: "string" } },
        libraries: { type: "array", items: { type: "string" } },
      },
    },
    architecture: {
      type: "object",
      required: ["overview", "key_components"],
      additionalProperties: false,
      properties: {
        overview: { type: "string" },
        key_components: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "description"],
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" },
            },
          },
        },
      },
    },
    security_notes: { type: "array", items: { type: "string" } },
    limitations: { type: "array", items: { type: "string" } },
    citations: {
      type: "array",
      items: {
        type: "object",
        required: ["section", "sources"],
        additionalProperties: false,
        properties: {
          section: { type: "string" },
          sources: {
            type: "array",
            items: {
              type: "object",
              required: ["path", "start_line", "end_line"],
              additionalProperties: false,
              properties: {
                path: { type: "string" },
                start_line: { type: "integer" },
                end_line: { type: "integer" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type DocPack = {
  meta: {
    owner: string;
    repo: string;
    ref: string;
    commit_sha?: string;
    generated_at_iso: string;
  };
  summary: { name: string; one_liner: string; description: string };
  features: string[];
  how_to_run: {
    prerequisites: string[];
    install_steps: string[];
    run_steps: string[];
  };
  tech_stack: {
    languages: string[];
    frameworks: string[];
    libraries: string[];
  };
  architecture: {
    overview: string;
    key_components: { name: string; description: string }[];
  };
  security_notes: string[];
  limitations: string[];
  citations?: {
    section: string;
    sources: { path: string; start_line: number; end_line: number }[];
  }[];
};
