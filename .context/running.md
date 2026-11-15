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
     today, N−1 days up to yesterday, picksUsed = floor((N−1)/5) so day 7/12 owe no pick and play their celebration).
     Fixtures are progress v9 with hiddenAt: Date.now() so other flows get no welcome;
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
  6. Robo's world (2026-11-14): the script ends with a world flow on ipad102-p, ipad102-p-tab, ipad102-l-tab and ip15
     (WORLD_VIEWS; a VIEWS override runs it only for listed names in that set). `WORLD_ONLY=1` runs just that (a minute or two);
     `RM=1 WORLD_ONLY=1` also asserts nothing in the pick animates under Reduce Motion.
     a) Behind the math: fixture day 5 practised, picksUsed 1, five items (WORLD_ITEMS) vs the same with no items:
        problem/answer/controls/every key box identical within 1px; data-world set, world-bg shown; the card
        (data-role="world-card") contains the problem and is under it; key 5 takes its tap; measure() passes (also after a Hint).
     b) The pick: fixture practised 4, 9 right today, picksUsed 0, 3 items; answerNow completes day 5 and the pick must
        open. Checks (pickCheck): frame, 3 kinds and OK inside the viewport, each >= 44px and takes its own tap, tray
        below the frame, no page scroll, the real Robo hidden; the answer doesn't change on a tap/key under the pick.
        Then: choose a ground kind (4 dims, OK still disabled), tap world (135, 250) → ghost of that kind, OK enabled;
        switch kind → ghost follows; rotate and back (still fits, ghost kept); OK → frame data-placed, dims gone, save has
        4 items/picksUsed 1/offer null; the pick closes (≤5 s), measure() passes with Robo back, key 2 changes the answer.
     Screenshots: out/world-<view>-{none,bg,bg-hint,pick,ghost,switched,rotated,cheer,after}[-rm].png.
  7. World celebrations (2026-11-15): the world flow also checks (a) the pick's picture and the background picture have the same
     rect after placing (one frame), (b) a 20-star walk, a conga (total 99) and a day celebration with a world: after the delay+slide the
     problem/keys are off screen, world in focus (data-focus), » >=44px top right, Robo house-door-sized (item 8), a tap on the world
     doesn't end it, » does and keys/controls are back where they were, whole thing under 8 s, conga under 6.4 s. RM=1: no transform.
     Screenshots out/world-<view>-cel-{stars,conga,day}.png. Run from /tmp/claude-1000/pw with playwright installed there.
  8. Robo in scale (2026-11-15): smallRoboCheck runs on every world celebration above (WORLD_ITEMS) and, in a section at the end,
     for three worlds (one tree, a house at the very bottom, a crowded one) x stars/conga/day on ipad102-p, ipad102-l-tab and
     ip15-land (852x393; sampled at 250 ms and 1.4 s). Asserts: Robo's boxes inside the viewport (only the day scene is held to left/right;
     the walk and the conga come in from the sides), height >= 20px (the floor) and < a door at his depth (skipped where the 20px floor
     applies: ip15-land and small phones), the day words on screen, a nearer house covers <= 60% of his box. Screenshots
     out/scale-<view>-<world>-<stars|conga|day>-<0|1>.png (-1 only for bottom-house); STATS=1 prints each case's numbers. Takes ~10 min with WORLD_ONLY=1;
     don't use `timeout` below 15 min. PUBLISH_PORT may be taken (5173): pass URL=http://localhost:<the port in dev.log>.
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
