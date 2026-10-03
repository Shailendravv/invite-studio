"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { OrderDto } from "@/lib/api";
import { getTemplate } from "@invite/shared/templates";
import { CopyButton, StatusBadge, TimeAgo } from "./bits";
import { SpecForm, type Issue } from "./SpecForm";

const ACTIVE = new Set(["received", "parsing", "ready", "rendering"]);
const EVENT: Record<string, string> = { birthday: "Birthday", engagement: "Engagement", wedding: "Wedding" };
const FIELD_LABEL: Record<string, string> = {
  eventType: "Occasion",
  personName: "Name",
  brideName: "Bride's name",
  groomName: "Groom's name",
  date: "Date",
  time: "Time",
  venueName: "Venue",
};

async function call(url: string, init: RequestInit): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.href = "/login";
  return { ok: res.ok, data };
}

export function OrderView({ initial, schemas }: { initial: OrderDto; schemas: Record<string, any> }) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { ok, data } = await call(`/api/orders/${initial.id}`, { method: "GET" });
    if (ok) setOrder(data.order);
  }, [initial.id]);

  useEffect(() => {
    if (!ACTIVE.has(order.status)) return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [order.status, refresh]);

  const act = async (name: string, url: string, body?: unknown, method = "POST") => {
    setBusy(name);
    setError(null);
    const { ok, data } = await call(url, { method, body: body ? JSON.stringify(body) : undefined });
    setBusy(null);
    if (!ok) {
      setError(data.error ?? "Something went wrong");
      return null;
    }
    return data;
  };

  const sendReply = async () => {
    const data = await act("reply", `/api/orders/${order.id}/append`, { text: reply });
    if (data) {
      setReply("");
      setOrder(data.order);
    }
  };

  const sendRevision = async () => {
    const data = await act("revise", `/api/orders/${order.id}/revise`, { instruction: revision });
    if (data) router.push(`/orders/${data.order.id}`);
  };

  const retry = async () => {
    const data = await act("retry", `/api/orders/${order.id}/retry`);
    if (data) setOrder(data.order);
  };

  const remove = async () => {
    if (!confirm("Delete this order and all its files (video, photos, text)? This cannot be undone.")) return;
    const data = await act("delete", `/api/orders/${order.id}`, undefined, "DELETE");
    if (data) {
      router.push("/orders");
      router.refresh();
    }
  };

  const saveSpec = async (spec: Record<string, any>): Promise<Issue[] | null> => {
    setError(null);
    const { ok, data } = await call(`/api/orders/${order.id}/spec`, { method: "PATCH", body: JSON.stringify({ spec }) });
    if (ok) {
      setOrder(data.order);
      return null;
    }
    setError(data.error ?? "Could not save");
    return data.issues ?? [];
  };

  const share = async () => {
    const url = order.links.share ?? order.links.video;
    if (!url) return;
    if (navigator.share) await navigator.share({ title: `${order.clientName ?? "Invitation"} video`, url }).catch(() => {});
    else await navigator.clipboard.writeText(url).catch(() => {});
  };

  const title = order.clientName || "New order";
  const templateName = order.templateId ? getTemplate(order.templateId)?.name : null;
  const canEdit = order.spec && ["needs_info", "ready", "done", "failed"].includes(order.status);

  return (
    <div>
      <a href="/orders" className="hint">
        ← All orders
      </a>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, margin: "8px 0 16px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ marginBottom: 4 }}>{title}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {order.eventType ? EVENT[order.eventType] : "Event"}
            {templateName ? ` · ${templateName}` : ""} · <TimeAgo iso={order.createdAt} />
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.revisionOf && (
        <div className="alert alert-info">
          Revision of <a href={`/orders/${order.revisionOf}`}>an earlier order</a>: “{order.revisionRequest}”
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* ---------- live status ---------- */}
      {ACTIVE.has(order.status) && (
        <div className="card stack" aria-live="polite">
          <strong>
            {order.status === "received" && "Waiting for the worker…"}
            {order.status === "parsing" && "Reading the message…"}
            {order.status === "ready" && "Details ready. Waiting to render…"}
            {order.status === "rendering" && `Rendering video… ${order.progress}%`}
          </strong>
          <div className="progress" role="progressbar" aria-valuenow={order.progress} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${order.status === "rendering" ? Math.max(order.progress, 2) : order.status === "ready" ? 2 : 0}%` }} />
          </div>
          {order.error && <p className="hint">{order.error}</p>}
        </div>
      )}

      {order.status === "failed" && (
        <div className="alert alert-danger stack">
          <strong>This order failed.</strong>
          <div style={{ whiteSpace: "pre-wrap" }}>{order.error}</div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={retry} disabled={busy === "retry"}>
              {busy === "retry" ? "Retrying…" : "Retry"}
            </button>
          </div>
        </div>
      )}

      {/* ---------- needs info ---------- */}
      {order.status === "needs_info" && (
        <div className="alert alert-warn stack">
          <strong>Missing details: {order.missingFields.map((f) => FIELD_LABEL[f] ?? f).join(", ")}</strong>
          {order.clientQuestion && (
            <>
              <div className="hint">Send this to the client:</div>
              <div className="question">{order.clientQuestion}</div>
              <div className="btn-row">
                <CopyButton text={order.clientQuestion} label="Copy question for client" className="btn btn-primary" />
                <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(order.clientQuestion)}`} target="_blank" rel="noreferrer">
                  Open in WhatsApp
                </a>
              </div>
            </>
          )}
          <div>
            <label htmlFor="reply">Client&apos;s reply</label>
            <textarea id="reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste the client's answer here" />
          </div>
          <button className="btn btn-primary" onClick={sendReply} disabled={!reply.trim() || busy === "reply"}>
            {busy === "reply" ? "Adding…" : "Add reply & check again"}
          </button>
          <p className="hint" style={{ margin: 0 }}>
            Or fill in the missing fields yourself under “Edit details”.
          </p>
        </div>
      )}

      {order.warning && order.status === "done" && (
        <div className="alert alert-warn">
          <strong>Please check the video before sending.</strong> The automatic proof-read flagged: {order.warning}
        </div>
      )}

      {/* ---------- video ---------- */}
      {order.status === "done" && order.links.video && (
        <div className="card stack">
          <div className="video-wrap">
            <video controls playsInline preload="metadata" poster={order.links.thumb} src={order.links.share ?? order.links.video} />
          </div>
          <div className="btn-row">
            {order.links.share && (
              <a className="btn btn-primary" href={`${order.links.share}?download=1`}>
                Download for WhatsApp
              </a>
            )}
            <a className="btn" href={`${order.links.video}?download=1`}>
              Download full quality
            </a>
            <button type="button" className="btn" onClick={share}>
              Share link
            </button>
            {order.links.share && <CopyButton text={order.links.share} label="Copy link" />}
          </div>
          <p className="hint" style={{ margin: 0 }}>
            Links expire after a few days. Reopen this page to get fresh ones.
          </p>
        </div>
      )}

      {order.status === "done" && (
        <div className="card stack">
          <h2>Request a change</h2>
          <textarea rows={3} value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="e.g. make it maroon and gold · change time to 8 PM · use Hindi" />
          <button className="btn btn-primary" onClick={sendRevision} disabled={!revision.trim() || busy === "revise"}>
            {busy === "revise" ? "Creating revision…" : "Create revised video"}
          </button>
          <p className="hint" style={{ margin: 0 }}>
            A new version is made; this video is kept.
          </p>
        </div>
      )}

      {/* ---------- edit ---------- */}
      {canEdit && (
        <details className="card" open={order.status === "needs_info"}>
          <summary>Edit details</summary>
          <div style={{ marginTop: 12 }}>
            <SpecForm key={order.updatedAt} initial={order.spec!} schemas={schemas} onSave={saveSpec} saveLabel={order.status === "done" ? "Save & re-render" : "Save & render"} />
          </div>
        </details>
      )}

      <details className="card">
        <summary>Client message</summary>
        <pre className="raw" style={{ marginTop: 12 }}>
          {order.rawText}
        </pre>
      </details>

      <details className="card">
        <summary>Activity</summary>
        <ul className="events" style={{ marginTop: 12 }}>
          {(order.events ?? []).map((e) => (
            <li key={e.id}>
              <time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              <span>
                <strong>{e.step}</strong> · {e.message}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div className="btn-row" style={{ marginBottom: 32 }}>
        <button className="btn btn-danger" onClick={remove} disabled={busy === "delete" || order.status === "rendering"}>
          Delete order and files
        </button>
      </div>
    </div>
  );
}
