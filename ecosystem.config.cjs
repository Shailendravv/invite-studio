// pm2 process file:  npx pm2 start ecosystem.config.cjs   (after `npm run build`)
// All paths are relative to this file so it works on Windows, macOS and Linux.
const path = require("node:path");

const root = __dirname;
const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

module.exports = {
  apps: [
    {
      name: "web",
      cwd: path.join(root, "apps", "web"),
      script: path.join(root, "node_modules", "next", "dist", "bin", "next"),
      args: "start -p 3000",
      interpreter: "node",
      env: { NODE_ENV: "production" },
      max_memory_restart: "800M",
      time: true,
    },
    {
      name: "worker",
      cwd: root, // Remotion keeps its downloaded Chrome under <cwd>/node_modules/.remotion
      script: tsx,
      args: "apps/worker/src/index.ts",
      interpreter: "node",
      env: { NODE_ENV: "production" },
      kill_timeout: 30000, // let a running parse finish on restart
      time: true,
    },
    {
      name: "tunnel",
      cwd: root,
      script: tsx,
      args: "scripts/tunnel.ts",
      interpreter: "node",
      restart_delay: 5000,
      time: true,
    },
  ],
};
