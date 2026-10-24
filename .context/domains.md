# Domain allowlist notes
- Playwright Chromium download: cdn.playwright.dev → storage.googleapis.com (Google IPs rotate).
  Fallback host playwright.download.prss.microsoft.com (199.232.210.172/.214.172) also blocked.
- cdn.playwright.dev rotates IPs within 150.171.110.0/24 (.149, .151, .152 seen) — single-IP ipset grants go
  stale within minutes; suggest allowing the /24. On 2026-10-24 storage.googleapis.com got allowed and the full
  Chromium build downloaded, but headless-shell/ffmpeg failed on cdn.playwright.dev (temporary grants, lost on restart).
- deb.debian.org: blocked (no longer needed — Chromium system libs are now baked into the container).
- Container hostname changes per run — always fill the real `hostname` into ipset commands given to the user.
- Docker socket not mounted (no /var/run/docker.sock) — user runs ipset commands from the host.
- 2026-10-24: added cdn.playwright.dev, playwright.download.prss.microsoft.com, storage.googleapis.com to
  /workspace/allowed-domains (user asked). Firewall resolves names once at startup (no CIDR support; an
  unresolvable line aborts startup), so rotating CDN IPs may still go stale — run playwright install soon after start.
- 2026-10-24: ngrok needs ngrok.com (setup doc), bin.equinox.io (agent tgz), connect.ngrok-agent.com (tunnel :443,
  ~6 rotating AWS IPs — DNS returns a subset each lookup) AND crl.ngrok-agent.com (:80, CRL fetch before auth; CloudFront).
  Granted temporarily via ipset. Agent at ~/.local/bin/ngrok, token in ~/.config/ngrok/ngrok.yml (outside repo, lost on restart).
  `!` commands have no stdin — token must be set via host `docker exec -it`, never inline.
- 2026-10-24: Playwright WebKit downloads fine from cdn.playwright.dev but can't launch (missing system libs:
  libflite, libjxl, libavif, libmanette, libGLESv2, libx264...; no root). Chromium CFT build redirects to
  storage.googleapis.com (rotating Google IPs: 142.250.x, 142.251.x, 173.194.x, 192.178/179.x) → blocked again.
