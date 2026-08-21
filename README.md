# Personal website

Static HTML/CSS. The hand-written pages have no build step; `/writing/` and
`/uni/` are generated from Markdown by `build.js` and the output is committed,
so GitHub Pages still just serves files.

- `index.html` — home
- `reading/` — the reading list (hand-written)
- `writing/` — **generated** from `posts/*.md`; edit the Markdown, not the HTML
- `posts/` — one Markdown file per post, filename becomes the URL slug
- `drafts/` — unfinished posts, gitignored, never published
- `uni/` — **generated** from `modules/`; the module tree, notes and flashcards
- `modules/` — one directory per module, directory name becomes the URL slug
- `build.js` — the generator
- `anki.js` — turns an Anki plain-text export into flip cards
- `style.css`, `theme.js` — shared styles and the light/dark toggle
- `404.html` — served by Pages for unknown paths
- `.nojekyll` — tells GitHub Pages to serve files as-is

## Writing a post

Create `posts/my-post.md`:

```markdown
---
title: Why Lean clicked
date: 2026-08-19
description: One line, used on the index, in the RSS feed and for link previews.
---

Prose goes here. Inline maths like $f: A \to B$ needs no escaping.
```

`updated: YYYY-MM-DD` is optional, for posts you revise later. Then:

```sh
npm install     # once
node build.js
```

and commit both the Markdown and the generated HTML.

### What you can use

| | |
|---|---|
| maths | `$inline$` and `$$display$$`, written exactly as in a `.tex` file |
| code | fenced blocks; `lean4`, `python`, `haskell`, `rust` and more |
| theorems | `::: theorem Name` … `:::` — also `lemma`, `definition`, `proof`, `remark` |
| footnotes | `text[^1]` with `[^1]: the note` |
| headings | `##` becomes `<h3>`, sitting under the post title, and gets a `#` anchor |

Maths is typeset at build time and code is highlighted at build time, so posts
ship no JavaScript. **A post that uses no maths links no maths stylesheet** —
nothing is paid for unless it is used.

## Adding a module

A module is a directory under `modules/`. Only `module.md` is required — the
other two files show up on the site simply because they exist.

```
modules/analysis-i/
  module.md     front matter + your thoughts on the module
  notes.md      optional, long-form notes in the same Markdown as a post
  cards.txt     optional, an Anki export
```

```markdown
---
title: Analysis I
year: prelims
term: michaelmas
description: One line, used on the /uni/ index and for link previews.
---
```

`year` is one of `prelims`, `part a`, `part b`, `part c`; `term` is one of
`michaelmas`, `hilary`, `trinity`. `status`, `lecturer` and `updated` are
optional. That gives you `/uni/analysis-i/`, plus `/uni/analysis-i/notes/` and
`/uni/analysis-i/cards/` if those files are there.

## Flashcards

Export from Anki with **File → Export → Notes in Plain Text (.txt)**, tick
**Include tags**, and save it as `modules/<slug>/cards.txt`. Re-exporting over
the same file and rebuilding is the whole update workflow — the export is one
card per line, so `git diff` shows exactly which cards changed.

Cards flip using `<details>`/`<summary>`, so **the page ships no JavaScript**:
they work with scripts disabled and the answers stay indexable.

Cloze notes become one card per `{{c1::…}}` ordinal, and maths written in any of
Anki's syntaxes (`\(…\)`, `\[…\]`, `[$]…[/$]`, `[latex]…[/latex]`) is typeset
with the same KaTeX the posts use — so it themes and scales properly instead of
arriving as a fixed-size image. Maths KaTeX cannot render (TikZ and friends)
fails the build naming the note; cards relying on an image are reported as a
warning, since a plain-text export carries no media.

## Drafts

Put unfinished posts in `drafts/`. They are gitignored, so they never publish.
To preview one:

```sh
node build.js --drafts
python3 -m http.server 8000
```

Run `node build.js` again (without the flag) before committing, to take the
drafts back out of `writing/`.

## Local preview

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploy

Pushing to `main` publishes via GitHub Pages (Settings → Pages → Source: Deploy
from a branch → `main` / root).

A GitHub Action rebuilds from the Markdown on every push and fails if the
committed HTML does not match — so a forgotten `node build.js` gets caught
before it reaches the site.
