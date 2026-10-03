"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { EVENT_TYPES, TEMPLATES } from "@invite/shared/templates";

const IMAGE_MAX = 10 * 1024 * 1024;
const AUDIO_MAX = 20 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/ogg";

const EVENT_LABEL: Record<string, string> = { birthday: "Birthday", engagement: "Engagement", wedding: "Wedding" };

export function NewOrderForm({ initialText }: { initialText: string }) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<File[]>([]);
  const [template, setTemplate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      const isAudio = f.type.startsWith("audio/");
      const isImage = f.type.startsWith("image/");
      if (!isAudio && !isImage) {
        setError(`${f.name}: only photos or audio`);
        continue;
      }
      if (f.size > (isAudio ? AUDIO_MAX : IMAGE_MAX)) {
        setError(`${f.name} is too large (max ${isAudio ? 20 : 10} MB)`);
        continue;
      }
      if (isAudio && next.some((x) => x.type.startsWith("audio/"))) {
        setError("Only one audio file per order");
        continue;
      }
      next.push(f);
    }
    setFiles(next.slice(0, 8));
    if (fileInput.current) fileInput.current.value = "";
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setText((prev) => (prev ? `${prev}\n${t}` : t));
    } catch {
      setError("Clipboard access was blocked. Long-press the box and choose Paste.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("rawText", text);
    if (template) form.set("templateChoice", template);
    for (const f of files) form.append("files", f);
    try {
      const res = await fetch("/api/orders", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
      router.push(`/orders/${data.order.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack">
      <div className="card stack">
        <div>
          <label htmlFor="raw">Client message</label>
          <textarea
            id="raw"
            className="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"e.g.\nRahul & Priya ki sagai hai 15 Nov ko, shaam 7 baje, Hotel Raj Palace Jaipur 🎉"}
            required
          />
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={pasteFromClipboard}>
            Paste from clipboard
          </button>
          {text && (
            <button type="button" className="btn" onClick={() => setText("")}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card stack">
        <div>
          <label htmlFor="files">
            Photos or music <span className="hint">(optional · photos up to 10 MB, one audio up to 20 MB)</span>
          </label>
          <input id="files" ref={fileInput} type="file" accept={ACCEPT} multiple onChange={(e) => addFiles(e.target.files)} />
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  {f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB{" "}
                  <button type="button" className="btn" style={{ minHeight: 28, padding: "2px 8px" }} onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className="card">
        <summary>Template {template ? `· ${TEMPLATES.find((t) => t.id === template)?.name}` : "· automatic"}</summary>
        <div className="stack" style={{ marginTop: 12 }}>
          <p className="hint" style={{ margin: 0 }}>
            Leave on automatic to rotate templates (a client gets a design they haven&apos;t had before).
          </p>
          <button type="button" className="template-option" aria-pressed={template === ""} onClick={() => setTemplate("")}>
            Automatic
            <small>Pick for me</small>
          </button>
          {EVENT_TYPES.map((et) => (
            <div key={et}>
              <div className="hint" style={{ fontWeight: 700, margin: "4px 0" }}>
                {EVENT_LABEL[et]}
              </div>
              <div className="template-grid">
                {TEMPLATES.filter((t) => t.eventType === et).map((t) => (
                  <button key={t.id} type="button" className="template-option" aria-pressed={template === t.id} onClick={() => setTemplate(t.id)}>
                    <span className="swatches" aria-hidden>
                      {[t.defaultPalette.background, t.defaultPalette.primary, t.defaultPalette.secondary, t.defaultPalette.accent].map((c) => (
                        <span key={c} style={{ background: c }} />
                      ))}
                    </span>
                    {t.name}
                    <small>{t.description}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <button className="btn btn-primary btn-block" disabled={busy || !text.trim()}>
        {busy ? "Creating…" : "Create order"}
      </button>
    </form>
  );
}
