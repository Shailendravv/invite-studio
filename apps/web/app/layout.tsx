import type { Metadata, Viewport } from "next";
import { hasSession } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invite Studio",
  description: "Turn a client's WhatsApp message into an invitation video",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Invite Studio", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7a1f3d",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await hasSession();
  return (
    <html lang="en">
      <body>
        {signedIn && (
          <header className="topbar">
            <div className="container">
              <a href="/" className="brand">
                <span className="brand-mark" aria-hidden />
                Invite Studio
              </a>
              <Nav />
            </div>
          </header>
        )}
        <main className="container">{children}</main>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
