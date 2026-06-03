# Goblers Knob 2026 Netlify Live Sync Project v2

This version uses the classic Netlify Function format: `netlify/functions/book.js`.
That is more reliable than the earlier ESM `.mjs` version.

## Upload checklist

Your GitHub repo root must contain exactly these items:

- `index.html`
- `package.json`
- `netlify.toml`
- `README_SETUP.md`
- `netlify/functions/book.js`

Do not upload the zip file itself. Do not upload the outer folder. Upload the contents of this folder.

## Netlify settings

- Build command: `npm run build`
- Publish directory: `.`
- Functions directory: `netlify/functions`

After deployment, this URL must return JSON:

`https://YOUR-SITE.netlify.app/.netlify/functions/book`

It should start with:

`{"ok":true`

If it returns HTML or starts with `<!DOCTYPE`, the function was not deployed.
