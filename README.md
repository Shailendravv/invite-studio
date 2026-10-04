# Invite Studio

Paste a client's WhatsApp message (English, Hindi or Hinglish) and get an invitation video back. Runs on your own computer; reachable from your phone anywhere through an ngrok tunnel.

```
paste message ──► saved as an order ──► AI reads it ──► missing details? ──► question to copy to the client
                                                    └─► complete ──► video rendered ──► saved under storage/clients/<name>/ ──► download link (+ phone notification)
```

Supported events: **birthday, engagement, wedding**. Fourteen templates (including Haldi and Mehndi ceremony templates), English, Hindi or both.

---

## 1. Requirements

| | |
|---|---|
| Node.js | 20.9 or newer (22 LTS recommended) |
| ffmpeg + ffprobe | on the PATH (`ffmpeg -version` must work). Windows: `winget install Gyan.FFmpeg` |
| Disk | ~1.5 GB for dependencies + headless Chrome; ~40 MB per finished order |
| CPU | Any modern CPU. A 30-45 s video renders in about 1.5-2 minutes on 8 cores |

Remotion downloads its own headless Chrome on the first render. No other installs are needed: pm2 and the ngrok client come with the project.

## 2. Setup

```bash
npm install
cp .env.example .env        # then fill it in (see below)
npm run build               # type-checks everything and builds the web app
npm test                    # unit tests (no API key needed)
npm run e2e                 # renders a real test video end to end (mock AI, ~2 min)
```

### `.env` keys

| Key | Required | What it is |
|---|---|---|
| `ADMIN_PASSWORD` | yes | Your login password. Or put a hash in `ADMIN_PASSWORD_HASH` (`npm run hash-password -- "your password"`) and leave this empty. |
| `SIGNING_SECRET` | yes | Long random string that signs logins and download links. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Changing it logs you out and invalidates all links. |
| `LLM_PROVIDER` | yes | `anthropic` (default), `openai`, `gemini`, `ollama`, or `mock` (no AI, for testing only) |
| `ANTHROPIC_API_KEY` | for `anthropic` | From console.anthropic.com. Default model: `claude-haiku-4-5-20251001` |
| `LLM_MODEL` | no | Override the model for the chosen provider |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL` | for `openai` | `OPENAI_BASE_URL` lets you point at any OpenAI-compatible server |
| `GEMINI_API_KEY` | for `gemini` | |
| `OLLAMA_BASE_URL` | for `ollama` | Local models; default `http://localhost:11434` |
| `QA_ENABLED` | no | `true` (default): the AI proof-reads 3 stills of each video and flags problems. Needs a provider with image support. |
| `NGROK_AUTHTOKEN`, `NGROK_DOMAIN` | for remote access | From dashboard.ngrok.com: your authtoken and your free static domain (e.g. `invite-studio.ngrok-free.app`) |
| `PUBLIC_BASE_URL` | no | Base of download links. Defaults to `https://$NGROK_DOMAIN`, else `http://localhost:3000` |
| `LINK_TTL_HOURS` | no | Download links expire after this many hours (default 72) |
| `NOTIFY_PROVIDER` | no | `ntfy` or `telegram` to get a push when a video is ready; empty = off |
| `NTFY_TOPIC`, `NTFY_SERVER` | for `ntfy` | Pick a long, hard-to-guess topic name; install the ntfy app and subscribe to it |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | for `telegram` | Create a bot with @BotFather; get your chat id by messaging the bot and opening `https://api.telegram.org/bot<TOKEN>/getUpdates` |
| `DATABASE_PATH`, `STORAGE_ROOT` | no | Defaults `./data/app.db` and `./storage` |
| `PARSE_CONCURRENCY`, `RENDER_CONCURRENCY`, `WORKER_POLL_MS` | no | Worker tuning |

## 3. Running

**Every day (recommended): pm2 runs everything in the background**

```bash
npm run build          # after every update
npm run pm2:start      # starts web (port 3000), worker and tunnel
npx pm2 status         # see what's running
npm run pm2:logs       # live logs (Ctrl+C to leave)
npm run pm2:stop
```

Start automatically after a reboot:

- **Linux / macOS:** `npx pm2 startup` (run the command it prints), then `npx pm2 save`.
- **Windows:** run `npx pm2 save` once. Then create a Task Scheduler task "At log on" that runs `cmd /c cd /d D:\path\to\invite-studio && npx pm2 resurrect`.

**While developing:** `npm run dev:web` and `npm run dev:worker` in two terminals; `npm run studio` opens Remotion Studio to preview templates.

## 4. Using it

1. Open `https://<your NGROK_DOMAIN>` on your phone and sign in. Use "Add to Home Screen" to install it like an app.
2. **New order:** paste the client's message (or, once installed, long-press the message in WhatsApp > Share > Invite Studio). Optionally add photos or one song. Optionally pick a template; "automatic" gives each client a design they haven't had before.
3. The order page updates by itself:
   - **Needs info:** shows what's missing and a ready-made question. Tap **Copy question for client** (or **Open in WhatsApp**), then paste their answer into **Client's reply**. You can also fill the fields yourself under **Edit details**.
   - **Rendering:** progress bar. About 2 minutes.
   - **Done:** play the video, **Download for WhatsApp** (small file, under 16 MB) or **Download full quality**, **Share link** or **Copy link**.
4. **Changes:** type a request under "Request a change" ("make it maroon and gold", "change time to 8 PM", "use Hindi"). A new version is made and the old one is kept. For small fixes you can also use **Edit details** > Save & re-render.
5. If the order shows a yellow "Please check the video" note, the automatic proof-read flagged something. Watch the video before sending.
6. **Delete order and files** removes the order and everything on disk for it.

Where files go:

```
storage/clients/rahul-priya/2026-11-15_engagement_k3f9x2ab/
  raw.txt  spec.json  uploads/  invitation.mp4  invitation_share.mp4  thumbnail.png  render.log
```

## 5. Remote access (ngrok)

- `npm run tunnel` (pm2 runs it for you) opens `https://$NGROK_DOMAIN` to your local port 3000.
- **Free plan limits:** monthly bandwidth and request caps. Send clients the **WhatsApp copy** (~12 MB) rather than the full-quality file, or download the video on your phone and send it as a file. Upgrade the ngrok plan if downloads grow.
- **Free plan warning page:** the first time someone opens an ngrok-free link in a browser, ngrok shows a "You are about to visit..." page with a **Visit Site** button. This also affects download links you send clients. Sending the video file itself in WhatsApp avoids it; a paid ngrok plan removes it.
- Download links are encrypted, expire (`LINK_TTL_HOURS`), and never reveal file paths. Reopen the order page to get fresh links.
- Everything except the login page and download links requires your password.

## 6. Keep the computer awake

The tunnel only works while the machine is on and awake.

- **Windows:** Settings > System > Power > Screen and sleep > "When plugged in, put my device to sleep after" = **Never**. Or in an admin terminal: `powercfg /change standby-timeout-ac 0` and `powercfg /change hibernate-timeout-ac 0`.
- **macOS:** System Settings > Displays > Advanced (or Battery > Options) > "Prevent automatic sleeping when the display is off". Or run `caffeinate -s` in a terminal while it should stay up.
- **Linux (systemd):** `sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target`.

The screen may turn off; only sleep or hibernate stops the server.

## 7. Backup

Everything lives in two folders:

- `data/` (the database: orders, history)
- `storage/` (client texts, photos, videos)

Copy both to an external drive or cloud folder regularly (stop pm2 first, or copy `data/app.db` together with its `app.db-wal` file). To restore, put them back and start again. `.env` holds your password and secret; keep a copy somewhere safe too.

## 8. Templates

| Event | Template | Look |
|---|---|---|
| Birthday | `bday-playful` | balloons, confetti, bunting, cake |
| Birthday | `bday-elegant` | black and gold, line frame, sparkles |
| Engagement | `eng-traditional` | red and gold, mandala, marigold toran |
| Engagement | `eng-modern` | pastel, clean serif, line-art rings |
| Engagement | `eng-sapphire` | deep blue and silver, light rays, fine gold frame |
| Engagement | `eng-rosegold` | blush and rose gold, falling petals |
| Wedding | `wed-royal` | maroon and gold, animated jharokha arch frame, Ganesha, diyas |
| Wedding | `wed-floral` | soft florals, one scene per function |
| Wedding | `wed-peacock` | teal and gold, fan of peacock feathers |
| Wedding | `wed-midnight` | navy and champagne gold, one scene per function |
| Haldi | `haldi-marigold` | sunny yellow, marigold garlands |
| Haldi | `haldi-glow` | turmeric gold, diya glow, drifting petals |
| Mehndi | `mehndi-henna` | deep green, cream henna vines |
| Mehndi | `mehndi-paisley` | cream and terracotta henna paisleys |

Haldi and Mehndi are ceremony templates under the **wedding** event type (there is no separate event type). They are never auto-picked for an ordinary wedding. The worker picks them when the invitation is for one ceremony only: the headline says Haldi or Mehndi ("Haldi Ceremony", "मेहंदी की रस्म"), or the headline does not say "wedding" and every listed function is that ceremony. You can always choose one by hand in the template picker on the order page.

`wed-royal` uses the jharokha as its frame, with a large Ganesha at the apex of the arch on every scene, mandap pillars along the sides, starburst ornaments, a small elephant and chhatri in the top corners and a kalash on the details scene. If a wedding lists a **Baraat** function, `wed-royal` also gets a Baraat scene (baarat horse, with a dhol and shehnai). The swastika mandala SVG is kept in `video/public/assets/svg` but is not used in any default template; the swastika engraved on the kalash is hidden. See "`wed-royal` layout" in [`docs/features/video-rendering.md`](docs/features/video-rendering.md#wed-royal-layout).

The new templates are built around the SVG files in `video/public/assets/svg` (marigold garland, toran, mehndi corner, paisley, mandala and floral borders, haldi bowl, diya, jhummar, rangoli, lotus, peacock feather), recoloured to each template's palette and animated in code. Other artwork is original and drawn in code; fonts are Google Fonts. To add a template see [`video/README.md`](video/README.md). To review every scene of every template as images: `npm run stills` (writes contact sheets to `.render-cache/stills/`).

## 9. Useful commands

| Command | |
|---|---|
| `npm test` | unit + fixture tests (mock AI) |
| `npm run test:live` | runs the 13 non-mock fixture messages against your real AI provider (costs a few cents) |
| `npm run e2e` | full pipeline to a rendered video, isolated in `.render-cache/e2e` (`-- --live` to use the real AI) |
| `npm run stills` | still of every scene of every template (`-- wed` to filter) |
| `npm run lint` / `npm run typecheck` | |
| `npm run hash-password -- "pw"` | prints `ADMIN_PASSWORD_HASH=...` |

## 10. Before going live: Remotion licence

Videos are rendered with [Remotion](https://www.remotion.dev). Remotion is free for individuals and small companies, but **for-profit organisations above a size threshold need a company licence**. This is a commercial service, so check [remotion.dev/license](https://remotion.dev/license) and buy a licence if it applies to you.

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| Login says "Server not configured" | Set `ADMIN_PASSWORD` and `SIGNING_SECRET` in `.env`, restart |
| Orders fail with "ANTHROPIC_API_KEY is not set" | Add the key, restart the worker (`npx pm2 restart worker`), then press **Retry** on the order |
| Stuck on "Waiting for the worker" | The worker isn't running: `npx pm2 status`, `npm run pm2:logs` |
| Render fails mentioning ffmpeg | Install ffmpeg and make sure `ffmpeg -version` works in a new terminal |
| Public URL doesn't open | `npx pm2 logs tunnel`; check `NGROK_AUTHTOKEN` / `NGROK_DOMAIN`, and that the computer is awake |
| "Too many attempts" at login | Wait 15 minutes (brute-force protection) |

Project documentation (architecture, features, API, decisions and their reasons): [`docs/`](docs/README.md). Rules for AI agents working on the code: [`AGENTS.md`](AGENTS.md).
