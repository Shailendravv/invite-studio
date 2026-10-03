// Public HTTPS tunnel to the web app via ngrok's official SDK (no separate binary to install).
// Equivalent to: ngrok http 3000 --url=$NGROK_DOMAIN
import ngrok from "@ngrok/ngrok";
import { config, loadEnv } from "@invite/shared/env";

loadEnv();
const authtoken = process.env.NGROK_AUTHTOKEN;
const domain = process.env.NGROK_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/+$/, "");

if (!authtoken || !domain) {
  console.error("Set NGROK_AUTHTOKEN and NGROK_DOMAIN in .env (free static domain: dashboard.ngrok.com > Domains).");
  process.exit(1);
}

const listener = await ngrok.forward({
  addr: config.port,
  authtoken,
  domain,
});
console.log(`Tunnel up: ${listener.url()} -> http://localhost:${config.port}`);

const close = async () => {
  await ngrok.disconnect().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
// Keep the process alive; pm2 restarts it if the tunnel dies.
setInterval(() => {}, 1 << 30);
