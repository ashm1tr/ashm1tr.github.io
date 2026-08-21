// anki.js — turns an Anki "Notes in Plain Text" export into flip cards.
//
// the export is a tsv with a small "#key: value" header. anki quotes any field
// containing a separator, newline or quote, rfc4180-style, so this parses
// properly rather than splitting on tabs and hoping.
//
// maths arrives as latex *source* — never as the fixed-dpi pngs an .apkg would
// carry — so it goes through the same katex the posts use and themes correctly
// in both palettes.

import katex from "katex";

/* ---------- header ---------- */

// anki writes the separator as a word, not as the character
const SEPARATORS = {
  tab: "\t", comma: ",", semicolon: ";", space: " ", pipe: "|", colon: ":",
};

function header(lines, file) {
  const meta = {};
  let i = 0;
  for (; i < lines.length; i++) {
    if (!lines[i].startsWith("#")) break;
    const at = lines[i].indexOf(":");
    if (at === -1) continue; // a bare comment line, not a directive
    meta[lines[i].slice(1, at).trim().toLowerCase()] = lines[i].slice(at + 1).trim();
  }
  const word = (meta.separator || "tab").toLowerCase();
  const sep = SEPARATORS[word] ?? (word.length === 1 ? word : null);
  if (!sep) throw new Error(`${file}: unknown "#separator:${meta.separator}"`);
  const col = (key) => (meta[key] ? Number(meta[key]) - 1 : -1); // the header counts from 1
  return {
    body: lines.slice(i).join("\n"),
    sep,
    notetype: col("notetype column"),
    deck: col("deck column"),
    tags: col("tags column"),
    guid: col("guid column"),
  };
}

/* ---------- rfc4180-ish rows ---------- */

function rows(text, sep) {
  const out = [];
  let row = [], field = "", quoted = false, i = 0;
  const push = () => { row.push(field); field = ""; };
  const endRow = () => { push(); if (row.some((f) => f !== "")) out.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; } // an escaped quote
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"' && field === "") { quoted = true; i++; continue; }
    if (c === sep) { push(); i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { endRow(); i++; continue; }
    field += c; i++;
  }
  if (field !== "" || row.length) endRow();
  return out;
}

/* ---------- field cleanup ---------- */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const decode = (s) =>
  s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, name) => {
    const named = ENTITIES[name.toLowerCase()];
    if (named !== undefined) return named;
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X"
        ? parseInt(name.slice(2), 16)
        : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : m;
    }
    return m;
  });

// tags whose meaning survives on a web page. everything else is unwrapped —
// the text is kept, the markup anki used for editor styling is dropped
const ALLOWED = new Set(["b", "i", "em", "strong", "u", "code", "sub", "sup", "ul", "ol", "li"]);

function sanitise(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    // anki uses a div per line, so the opening tag is a line break too
    .replace(/<\/?(div|p)\b[^>]*>/gi, "\n")
    .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (m, close, tag) =>
      ALLOWED.has(tag.toLowerCase()) ? `<${close}${tag.toLowerCase()}>` : "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------- maths ---------- */

// every delimiter anki can produce. the legacy [latex] forms are the ones anki
// would otherwise bake into images, so working from the source is a clear gain.
const MATHS = [
  [/\\\((.+?)\\\)/gs, false],
  [/\\\[(.+?)\\\]/gs, true],
  [/\[\$\$\]([\s\S]+?)\[\/\$\$\]/g, true],
  [/\[\$\]([\s\S]+?)\[\/\$\]/g, false],
  [/\[latex\]([\s\S]+?)\[\/latex\]/gi, true],
];

const SLOT = (n) => ` @@katex${n}@@ `;

// a field is html, so "<" inside maths arrives as "&lt;" — katex rejects that
// outright ("Expected 'EOF', got '&'"), which is why the source is decoded here
// and not left to the renderer
function lift(raw) {
  const held = [];
  let text = raw;
  for (const [re, display] of MATHS) {
    text = text.replace(re, (_, tex) => {
      held.push({ tex: decode(tex.replace(/<br\s*\/?>/gi, "\n")).trim(), display });
      return SLOT(held.length - 1);
    });
  }
  return { text, held };
}

function typeset(text, held, where) {
  return text.replace(/@@katex(\d+)@@/g, (_, n) => {
    const { tex, display } = held[Number(n)];
    try {
      return katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: false });
    } catch (e) {
      throw new Error(`${where}: katex could not render "${tex}" — ${e.message}`);
    }
  });
}

// line breaks are resolved before the maths goes in: katex's mathml annotation
// repeats the source verbatim, so a later newline pass would inject <br> inside it
function field(raw, where) {
  const { text, held } = lift(raw);
  return typeset(sanitise(text).replace(/\n/g, "<br>\n"), held, where);
}

/* ---------- cloze ---------- */

const CLOZE = /\{\{c(\d+)::(.*?)\}\}/gs;
const HAS_CLOZE = /\{\{c\d+::/;

function ordinals(text) {
  return [...new Set([...text.matchAll(CLOZE)].map((m) => Number(m[1])))].sort((a, b) => a - b);
}

// on the front the target is a gap — its hint if it has one — while every other
// cloze is already showing, which is how anki presents it
function cloze(text, target, reveal) {
  return text.replace(CLOZE, (_, n, inner) => {
    const [answer, hint] = inner.split("::");
    if (Number(n) !== target) return answer;
    return reveal ? `<b>${answer}</b>` : `[${hint ? hint.trim() : "..."}]`;
  });
}

/* ---------- the deck ---------- */

export function parseDeck(text, file) {
  const { body, sep, notetype, deck, tags, guid } = header(text.split(/\r?\n/), file);
  const skip = new Set([notetype, deck, tags, guid].filter((i) => i >= 0));
  const cards = [];
  const noMedia = [];

  rows(body, sep).forEach((row, n) => {
    const where = `${file}: note ${n + 1}`;
    const fields = row.filter((_, i) => !skip.has(i)).map((f) => f.trim()).filter(Boolean);
    if (!fields.length) return;
    const tagList = tags >= 0 && row[tags] ? row[tags].trim().split(/\s+/).filter(Boolean) : [];
    // a plain-text export carries no media, so a card leaning on an image is
    // reported rather than published blank
    if (fields.some((f) => /<img\b/i.test(f))) noMedia.push(where);

    // the note type is inferred from the text, so the export does not have to
    // have had "include notetype" ticked
    if (HAS_CLOZE.test(fields.join(" "))) {
      const [text, ...rest] = fields;
      const extra = rest.length ? field(rest.join("\n"), where) : "";
      for (const ord of ordinals(text)) {
        cards.push({
          front: field(cloze(text, ord, false), where),
          back: field(cloze(text, ord, true), where) + (extra ? `<br>\n${extra}` : ""),
          tags: tagList,
        });
      }
      return;
    }

    const [front, ...back] = fields;
    cards.push({
      front: field(front, where),
      back: back.length ? field(back.join("\n"), where) : "",
      tags: tagList,
    });
  });

  return { cards, noMedia };
}
