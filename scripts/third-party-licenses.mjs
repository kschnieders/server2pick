/**
 * Collects every third-party component and writes THIRD-PARTY-LICENSES.md.
 *
 * Run it after changing dependencies:  node scripts/third-party-licenses.mjs
 *
 * What it gathers, and why that shape: the permissive licences in use all ask
 * for two things to travel with a binary — the copyright line, which differs
 * per project, and the permission notice, which is identical for everyone using
 * the same licence. So each component is listed with its own copyright line,
 * and the full text of each distinct licence is appended once. Repeating a
 * 200-line Apache notice five hundred times would bury the part that varies.
 *
 * Rust crates are read from Cargo.lock against the local registry cache, so a
 * crate that has never been downloaded cannot be resolved; those are listed
 * separately rather than silently dropped. The list also spans every platform
 * Cargo.lock mentions, which is wider than what a Windows build actually ships.
 * Over-listing is the safe direction.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The separator has to include "_": Tauri ships LICENSE_MIT, and leaving the
// underscore out silently dropped its copyright line. The plural matters too:
// cfg_aliases carries its borrowed-code attribution in NOTICES.md, and a
// pattern without the "S" passed straight over it.
const LICENSE_FILE = /^(LICEN[CS]E|COPYING|NOTICES?)([-._].*)?$/i;

/**
 * The real copyright line of a licence file, which is the part that varies.
 *
 * Two traps: Apache-2.0 contains the phrase "the copyright owner" in its
 * definitions and a "Copyright [yyyy] [name of copyright owner]" placeholder in
 * its appendix, so a naive search for "copyright" reports boilerplate as if it
 * were the author's name. Both are excluded, and a dual-licensed crate is read
 * from its MIT file first, because that is the one carrying a filled-in line.
 */
function copyrightFrom(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return { copyright: null, text: null };
  }

  const files = entries
    .filter((e) => LICENSE_FILE.test(e))
    .sort((a, b) => Number(/apache/i.test(a)) - Number(/apache/i.test(b)));

  let fallbackText = null;

  for (const name of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(dir, name), "utf8");
    } catch {
      continue;
    }
    fallbackText ??= text;

    const line = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      // "Copyright" has to be followed by a year or a (c) marker. Apache-2.0
      // wraps its prose such that a line can begin with "copyright notice that
      // is included in..." — which reads like a hit and is pure boilerplate.
      .find(
        (l) =>
          /^copyright\s+(\(c\)|©|\d{4})/i.test(l) &&
          !/\[yyyy\]|\[name of copyright owner\]/i.test(l),
      );

    if (line) return { copyright: line, text };
  }

  return { copyright: null, text: fallbackText };
}

function rustCrates() {
  const lock = fs.readFileSync(path.join(root, "src-tauri", "Cargo.lock"), "utf8");
  const named = [...lock.matchAll(/^name = "(.+)"\r?\nversion = "(.+)"/gm)];

  const registry = path.join(os.homedir(), ".cargo", "registry", "src");
  let roots = [];
  try {
    roots = fs.readdirSync(registry).map((d) => path.join(registry, d));
  } catch {
    // No cargo cache on this machine — everything lands in `unresolved`.
  }

  const found = [];
  const unresolved = [];

  for (const [, name, version] of named) {
    if (name === "server2pick") continue;

    const dir = roots
      .map((r) => path.join(r, `${name}-${version}`))
      .find((p) => fs.existsSync(path.join(p, "Cargo.toml")));

    if (!dir) {
      unresolved.push({ name, version });
      continue;
    }

    const manifest = fs.readFileSync(path.join(dir, "Cargo.toml"), "utf8");
    const license =
      manifest.match(/^license\s*=\s*"(.+?)"/m)?.[1] ??
      (manifest.match(/^license-file\s*=\s*"(.+?)"/m) ? "see licence file" : "not stated");

    found.push({
      name,
      version,
      license,
      notice: noticeFrom(dir),
      ...copyrightFrom(dir),
    });
  }

  return { found, unresolved };
}

function npmPackages() {
  const out = [];

  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name.startsWith("@")) {
        visit(full);
        continue;
      }
      const manifest = path.join(full, "package.json");
      if (!fs.existsSync(manifest)) continue;
      try {
        const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
        const license =
          typeof pkg.license === "string"
            ? pkg.license
            : pkg.license?.type ??
              (Array.isArray(pkg.licenses)
                ? pkg.licenses.map((l) => l.type).join(" OR ")
                : "not stated");
        out.push({
          name: pkg.name ?? entry.name,
          version: pkg.version ?? "?",
          license,
          notice: noticeFrom(full),
          ...copyrightFrom(full),
        });
      } catch {
        // A malformed package.json is the package's problem, not ours.
      }
      visit(path.join(full, "node_modules"));
    }
  };

  visit(path.join(root, "node_modules"));
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * NOTICE files, reproduced whole and per component.
 *
 * They are the one category that cannot be deduplicated: a licence text is the
 * same for everyone using that licence, but a notice carries attribution this
 * project owes onward — cfg_aliases, for instance, passes along the MIT terms
 * of code it borrowed from tectonic_cfg_support. Apache-2.0 section 4(d) makes
 * carrying them explicit; the others expect it through their attribution
 * clause.
 */
function noticeFrom(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const name = entries.find((e) => /^NOTICES?([-._].*)?$/i.test(e));
  if (!name) return null;
  try {
    return fs.readFileSync(path.join(dir, name), "utf8").trim();
  } catch {
    return null;
  }
}

function table(rows) {
  const lines = ["| Component | Version | License | Copyright |", "|---|---|---|---|"];
  for (const r of rows) {
    const copyright = (r.copyright ?? "—").replace(/\|/g, "\\|");
    lines.push(`| ${r.name} | ${r.version} | ${r.license} | ${copyright} |`);
  }
  return lines.join("\n");
}

/**
 * One full text per distinct licence — keyed by the text itself, not by the
 * SPDX string. "MIT OR Apache-2.0", "Apache-2.0/MIT" and "Apache-2.0 AND MIT"
 * all ship the same Apache text, and grouping by the label would repeat it a
 * dozen times and bury everything else.
 */
function licenceTexts(all) {
  // One representative per SPDX label first. Grouping by the text alone would
  // not collapse anything for MIT — each MIT file embeds its own copyright, so
  // no two are byte-identical — and the output would grow to hundreds of
  // near-identical notices.
  const byLabel = new Map();
  for (const item of all) {
    if (!item.text || byLabel.has(item.license)) continue;
    byLabel.set(item.license, item);
  }

  // Then fold together the labels that turned out to carry the same text, which
  // is what happens to every Apache-2.0 spelling.
  const byText = new Map();
  for (const [label, item] of byLabel) {
    const key = item.text.trim().replace(/\r\n/g, "\n");
    const entry = byText.get(key);
    if (entry) entry.labels.add(label);
    else byText.set(key, { labels: new Set([label]), source: item.name });
  }

  return [...byText]
    .map(([text, { labels, source }]) => ({
      heading: [...labels].sort().join(", "),
      text,
      source,
    }))
    .sort((a, b) => a.heading.localeCompare(b.heading))
    .map(
      ({ heading, text, source }) =>
        `### ${heading}\n\nAs shipped by \`${source}\`:\n\n\`\`\`\n${text}\n\`\`\``,
    )
    .join("\n\n");
}

const rust = rustCrates();
const npm = npmPackages();
const all = [...rust.found, ...npm];

const notices = all.filter((c) => c.notice);

const noticeSection = notices.length
  ? `\n## Additional notices\n\nComponents that carry a notice of their own, reproduced in full.\n\n${notices
      .map((c) => `### ${c.name} ${c.version}\n\n\`\`\`\n${c.notice}\n\`\`\``)
      .join("\n\n")}\n`
  : "";

const unresolvedSection = rust.unresolved.length
  ? `\n## Not resolved locally\n\nThese crates appear in \`Cargo.lock\` but are not in this machine's cargo\nregistry cache, so their licence could not be read. Most are platform crates\nfor targets this app is not built for.\n\n${rust.unresolved
      .map((c) => `- ${c.name} ${c.version}`)
      .join("\n")}\n`
  : "";

const doc = `# Third-party licenses

server2pick itself is MIT licensed; see [LICENSE](LICENSE). The components
below are not ours and remain under their own terms, reproduced here because
those terms ask for it.

Generated by \`scripts/third-party-licenses.mjs\` — do not edit by hand.

- Rust crates: ${rust.found.length} resolved, ${rust.unresolved.length} unresolved
- npm packages: ${npm.length}
- Components with their own notice: ${notices.length}

## Rust crates

${table(rust.found)}

## npm packages

${table(npm)}
${unresolvedSection}${noticeSection}
## License texts

${licenceTexts(all)}
`;

fs.writeFileSync(path.join(root, "THIRD-PARTY-LICENSES.md"), doc);
console.log(
  `THIRD-PARTY-LICENSES.md: ${rust.found.length} crates, ${npm.length} npm packages, ` +
    `${rust.unresolved.length} unresolved`,
);
