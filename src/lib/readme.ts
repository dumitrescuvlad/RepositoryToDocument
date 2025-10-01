import { marked } from "marked";
import { DocPack } from "./schema";

export function renderReadmeMd(doc: DocPack): string {
  const cite = (section: string) => {
    const c = doc.citations?.find((x) => x.section === section);
    if (!c || c.sources.length === 0) return "";
    const lines = c.sources
      .map((s) => `- \`${s.path}:${s.start_line}-${s.end_line}\``)
      .join("\n");
    return `\n**Sources**:\n${lines}\n`;
  };

  return `# ${doc.summary.name || doc.meta.repo}

> ${doc.summary.one_liner}

${doc.summary.description}

## Features
${doc.features.length ? doc.features.map((f) => `- ${f}`).join("\n") : "_None_"}
${cite("features")}

## How to Run
**Prerequisites**
${
  doc.how_to_run.prerequisites.length
    ? doc.how_to_run.prerequisites.map((i) => `- ${i}`).join("\n")
    : "- Unknown"
}

**Install**
${
  doc.how_to_run.install_steps.length
    ? doc.how_to_run.install_steps.map((i) => `1. ${i}`).join("\n")
    : "1. Unknown"
}

**Run**
${
  doc.how_to_run.run_steps.length
    ? doc.how_to_run.run_steps.map((i) => `1. ${i}`).join("\n")
    : "1. Unknown"
}
${cite("how_to_run")}

## Tech Stack
- **Languages**: ${fmtList(doc.tech_stack.languages)}
- **Frameworks**: ${fmtList(doc.tech_stack.frameworks)}
- **Libraries**: ${fmtList(doc.tech_stack.libraries)}
${cite("tech_stack")}

## Architecture
${doc.architecture.overview}

**Key Components**
${
  doc.architecture.key_components.length
    ? doc.architecture.key_components
        .map((k) => `- **${k.name}**: ${k.description}`)
        .join("\n")
    : "- Unknown"
}
${cite("architecture")}

## Security Notes
${
  doc.security_notes.length
    ? doc.security_notes.map((s) => `- ${s}`).join("\n")
    : "- Unknown"
}
${cite("security_notes")}

## Limitations
${
  doc.limitations.length
    ? doc.limitations.map((s) => `- ${s}`).join("\n")
    : "- Unknown"
}
${cite("limitations")}

---

_Generated at ${doc.meta.generated_at_iso} for \`${doc.meta.owner}/${
    doc.meta.repo
  }\` @ \`${doc.meta.ref}\`${
    doc.meta.commit_sha ? ` (commit ${doc.meta.commit_sha})` : ""
  }._
`;
}

function fmtList(arr: string[]) {
  return arr.length ? arr.join(", ") : "Unknown";
}

export function markdownToHtml(md: string) {
  return marked.parse(md) as string;
}
