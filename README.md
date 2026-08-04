# Personal website

Static HTML/CSS. No build step, no framework.

- `index.html` — the page
- `style.css` — styles
- `.nojekyll` — tells GitHub Pages to serve files as-is

## Local preview

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploy

Pushing to `main` publishes via GitHub Pages (Settings → Pages → Source: Deploy from a branch → `main` / root).
