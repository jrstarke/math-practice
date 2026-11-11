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
  3. `node shots.mjs` (env: SEEDS=n, VIEWS=[[name,w,h],...], URL=..., OP=÷) → screenshots in /tmp/claude-1000/pw/out
     Exits 1 on any failure; the only accepted one is se-tab `cell 31<38`. Don't pipe it through `tail` (hides the exit code).
  4. Robo (2026-11-08): the same script ends with a Robo flow per view (thinking, hint ×2, rotate and back, wrong,
     mid-walk / high five / kick with a tap-through-the-pad check). `ROBO_ONLY=1` runs just that (~3 min);
     Since 2026-11-11 it also checks the welcome (fixture hiddenAt: null) and day celebrations day-1/3/7/12 (fixture: 9 right
     today, N−1 days up to yesterday). Fixtures are progress v8 with hiddenAt: Date.now() so other flows get no welcome;
     `RM=1` runs it with prefers-reduced-motion. Screenshots: out/robo-<view>-<state>.png (her iPad: ipad102-p, ipad102-p-tab).
     Every measured state also checks Robo never overlaps the problem, answer boxes, bubble, picture or controls.
  5. Celebrations (2026-11-11): the Robo flow also plays every level-up style, every 20-star style, conga-2 (total 99)
     and conga-10 (total 899) per view, forced with the dev-only URL value ?roboRng=<0..1> (src/main.ts; stripped from
     builds): style k of a group of n is (k + 0.5) / n (level-ups n=9, 20 stars n=7, order as LEVEL_UPS / STAR_STYLES in
     src/core/robo.ts). momentCheck at ~40% and ~70%: nothing over problem/answer/bubble/picture/controls, nothing above or
     below the lane (slots, words, balls, goal; robots' drawn bodies too except in rotating scenes: cartwheel, dance,
     light-show, ball-ride, header), right data-moment, conga robot count; conga-10 also rotates mid-moment.
     Screenshots out/robo-<view>-<level|stars>-<style>-40.png, robo-<view>-conga-<n>-40.png. A fixed roboRng below 1/15
     also makes surprises fire on clean answers (harmless for the check).
  - Robo poses/moments preview (dev only, not built): /robo-preview.html and /robo-preview.html?moment=walk|walk-friend|<level-up style>|stars-<20-star style>|conga-2|conga-5|conga-10|kick|day-1|day-3|day-7|day-12|welcome|peek|surprise|wrong|right|up (&size=68 for a short lane)
  - Gotchas: $PUBLISH_PORT may already be taken by another process — then Vite picks the next port (check dev.log) and the
    URL must match. Vite's file watcher can miss edits on the /workspace mount: if a run looks like old code,
    `curl -s $URL/src/ui/app.ts | grep <new code>` and restart Vite with `--force`. Never `pkill -f "vite --host"`
    from a command line containing that text (it kills its own shell) — kill the PID from `ss -ltnp`.
- Public HTTPS via ngrok (for iPad PWA/offline testing): `npm run preview` then
  `~/.local/bin/ngrok http $PUBLISH_PORT --host-header=rewrite` (background) → https://slate-washer-unreal.ngrok-free.dev
  (static dev domain). `--host-header=rewrite` is required: vite preview 403s unknown Host headers.
  Needs ngrok domains granted (see domains.md) + authtoken set via host `docker exec -it` (lost on restart).
- Deploy (2026-10-25): two repos, same code + workflow, each GitHub Pages w/ custom domain, built at root:
  remote `dev` = jrstarke/math-practice-dev → math-practice-dev.jamiestarke.com (user pushes manually);
  remote `prod` = jrstarke/math-practice → math-practice.jamiestarke.com (user pushes when ready).
  User pushes from the host (container has no GitHub auth). DNS is on Cloudflare (proxied IPs 104.21.x/172.67.x).
  Custom domains are blocked by the container firewall — can't curl them from here.
