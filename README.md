# Personal website

Static HTML/CSS. The hand-written pages have no build step; `/writing/` is
generated from Markdown by `build.js` and the output is committed, so GitHub
Pages still just serves files.

- `index.html` — home
- `reading/` — the reading list (hand-written)
- `writing/` — **generated** from `posts/*.md`; edit the Markdown, not the HTML
- `posts/` — one Markdown file per post, filename becomes the URL slug
- `drafts/` — unfinished posts, gitignored, never published
- `build.js` — the generator
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
