import type { MetadataRoute } from "next";

/** Installable PWA with a Web Share Target: WhatsApp > Share > Invite Studio opens "/" with ?text=... */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Invite Studio",
    short_name: "Invites",
    description: "Turn a client's WhatsApp message into an invitation video",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#7a1f3d",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
