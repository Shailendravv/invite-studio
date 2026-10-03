import { requirePageSession } from "@/lib/auth";
import { NewOrderForm } from "@/components/NewOrderForm";

export const dynamic = "force-dynamic";

/** New order. Also the PWA share target: WhatsApp "Share" lands here with ?text=... */
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageSession();
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const shared = [pick("title"), pick("text"), pick("url")].filter(Boolean).join("\n").slice(0, 20_000);
  return (
    <>
      <h1>New order</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Paste the client&apos;s WhatsApp message. English, Hindi or Hinglish, messy is fine.
      </p>
      <NewOrderForm initialText={shared} />
    </>
  );
}
