# Running
- Install: `npm install`
- Tests: `npx vitest run` (UI tests use jsdom via `// @vitest-environment jsdom`)
- Typecheck+build: `npm run build` (→ dist/, includes sw.js + manifest)
- Dev: `npm run dev` / built preview: `npm run preview` — both bind 0.0.0.0:$PUBLISH_PORT
  → open http://localhost:$PUBLISH_PORT (iPad: http://<host LAN IP>:$PUBLISH_PORT)
  If $PUBLISH_PORT is unset, they fall back to 5173 / 4173 — only reachable inside the container.
- Regenerate icons from public/icon.svg: `npm run icons`
- Note: `sed -i` fails on the /workspace mount (permission on temp file) — edit with node/Edit tool instead.
- Layout regression check (Playwright):
  1. `PUBLISH_PORT=5173 npm run dev` (background)
  2. `mkdir -p /tmp/claude-1000/pw/out && cp .context/playwright/* /tmp/claude-1000/pw/ && cd /tmp/claude-1000/pw && npm i playwright`
  3. `node shots.mjs` (env: SEEDS=n, VIEWS=[[name,w,h],...], URL=...) → screenshots in /tmp/claude-1000/pw/out
- Public HTTPS via ngrok (for iPad PWA/offline testing): `npm run preview` then
  `~/.local/bin/ngrok http $PUBLISH_PORT --host-header=rewrite` (background) → https://slate-washer-unreal.ngrok-free.dev
  (static dev domain). `--host-header=rewrite` is required: vite preview 403s unknown Host headers.
  Needs ngrok domains granted (see domains.md) + authtoken set via host `docker exec -it` (lost on restart).
- Deploy (2026-10-25): two repos, same code + workflow, each GitHub Pages w/ custom domain, built at root:
  remote `dev` = jrstarke/math-practice-dev → math-practice-dev.jamiestarke.com (user pushes manually);
  remote `prod` = jrstarke/math-practice → math-practice.jamiestarke.com (user pushes when ready).
  User pushes from the host (container has no GitHub auth). DNS is on Cloudflare (proxied IPs 104.21.x/172.67.x).
  Custom domains are blocked by the container firewall — can't curl them from here.
