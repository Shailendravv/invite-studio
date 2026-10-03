"use client";

// Edit form generated from the JSON Schema of the shared zod schemas. A few
// keys get friendlier widgets (template picker, colour pickers, date input).
import { useMemo, useState } from "react";
import { formatDisplayDate } from "@invite/shared/format";
import { EVENT_TYPES, getTemplate, templatesFor, type EventType } from "@invite/shared/templates";

type JS = {
  type?: string | string[];
  properties?: Record<string, JS>;
  required?: string[];
  enum?: unknown[];
  const?: unknown;
  items?: JS;
  description?: string;
  pattern?: string;
  anyOf?: JS[];
};

export type Issue = { path: string; message: string };

const LABELS: Record<string, string> = {
  personName: "Name",
  age: "Age (turning)",
  hostedBy: "Hosted by",
  brideName: "Bride's name",
  groomName: "Groom's name",
  brideFamily: "Bride's family line",
  groomFamily: "Groom's family line",
  date: "Date",
  displayDate: "Date as shown in the video",
  time: "Time",
  venueName: "Venue",
  venueAddress: "Address",
  rsvp: "RSVP",
  blessingLine: "Blessing line",
  templateId: "Template",
  language: "Language",
  palette: "Colours",
  wording: "Wording",
  wordingHi: "Hindi wording",
  functions: "Functions (Haldi, Mehendi, Sangeet…)",
  headline: "Headline",
  invitation: "Invitation sentence",
  closing: "Closing line",
  name: "Function name",
  primary: "Main",
  secondary: "Second",
  accent: "Accent",
  background: "Background",
  text: "Text",
};

const ORDER = [
  "personName", "age", "hostedBy", "groomName", "groomFamily", "brideName", "brideFamily",
  "date", "displayDate", "time", "venueName", "venueAddress", "rsvp", "blessingLine",
  "language", "templateId", "wording", "wordingHi", "functions", "palette",
];
const HIDDEN = new Set(["eventType", "photos", "audio"]);
const MULTILINE = new Set(["invitation", "closing", "venueAddress", "rsvp"]);
const LANGS: Record<string, string> = { en: "English", hi: "Hindi", both: "Hindi + English" };

const humanize = (k: string) => LABELS[k] ?? k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function setIn(obj: any, path: (string | number)[], value: unknown): any {
  const [head, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) };
  if (rest.length === 0) {
    if (value === undefined || value === "") delete copy[head as any];
    else copy[head as any] = value;
  } else {
    copy[head as any] = setIn(copy[head as any] ?? (typeof rest[0] === "number" ? [] : {}), rest, value);
  }
  return copy;
}

function prepare(spec: Record<string, any>): Record<string, any> {
  const eventType: EventType = EVENT_TYPES.includes(spec.eventType) ? spec.eventType : "birthday";
  const templateOk = getTemplate(spec.templateId)?.eventType === eventType;
  return {
    language: "en",
    ...spec,
    eventType,
    templateId: templateOk ? spec.templateId : templatesFor(eventType)[0].id,
    wording: spec.wording ?? { headline: "", invitation: "", closing: "" },
  };
}

export function SpecForm({
  initial,
  schemas,
  onSave,
  saveLabel = "Save & render",
  disabled,
}: {
  initial: Record<string, any>;
  schemas: Record<string, JS>;
  onSave: (spec: Record<string, any>) => Promise<Issue[] | null>;
  saveLabel?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, any>>(() => prepare(initial));
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState(false);
  const schema = schemas[draft.eventType] as JS;
  const issueFor = useMemo(() => new Map(issues.map((i) => [i.path, i.message])), [issues]);

  const update = (path: (string | number)[], value: unknown) => {
    setDraft((d) => {
      let next = setIn(d, path, value);
      // Keep the on-screen date in sync when the date changes.
      if (path.length && path[path.length - 1] === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const parentPath = path.slice(0, -1);
        const parent = parentPath.reduce((o: any, k) => o?.[k], d) ?? {};
        const lang = d.language === "hi" ? "hi" : "en";
        const oldAuto = parent.date ? formatDisplayDate(parent.date, lang) : "";
        if (!parent.displayDate || parent.displayDate === oldAuto) next = setIn(next, [...parentPath, "displayDate"], formatDisplayDate(value, lang));
      }
      return next;
    });
  };

  const changeEventType = (et: EventType) => setDraft((d) => ({ ...d, eventType: et, templateId: templatesFor(et)[0].id }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await onSave(draft);
    setIssues(result ?? []);
    setBusy(false);
  };

  const renderField = (key: string, node: JS, value: any, path: (string | number)[], required: boolean): React.ReactNode => {
    const id = `f-${path.join("-")}`;
    const p = path.join(".");
    const err = issueFor.get(p);
    const label = (
      <label htmlFor={id}>
        {humanize(key)} {required ? <span aria-hidden>*</span> : <span className="hint">(optional)</span>}
        {node.description && <span className="hint"> · {node.description}</span>}
      </label>
    );
    const errorEl = err ? <div className="error-text">{err}</div> : null;
    const types = Array.isArray(node.type) ? node.type : [node.type];

    if (key === "templateId" && path.length === 1) {
      return (
        <div key={p}>
          {label}
          <select id={id} value={value ?? ""} onChange={(e) => update(path, e.target.value)}>
            {templatesFor(draft.eventType).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.description}
              </option>
            ))}
          </select>
          {errorEl}
        </div>
      );
    }
    if (key === "language" && node.enum) {
      return (
        <div key={p}>
          {label}
          <select id={id} value={value ?? "en"} onChange={(e) => update(path, e.target.value)}>
            {node.enum.map((v) => (
              <option key={String(v)} value={String(v)}>
                {LANGS[String(v)] ?? String(v)}
              </option>
            ))}
          </select>
          {errorEl}
        </div>
      );
    }
    if (key === "palette") {
      const defaults = getTemplate(draft.templateId)?.defaultPalette;
      return (
        <fieldset key={p}>
          <legend>{humanize(key)}</legend>
          <label style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={!!value} onChange={(e) => update(path, e.target.checked ? { ...defaults } : undefined)} /> Use custom colours (otherwise the
            template&apos;s own)
          </label>
          {value && (
            <div className="row" style={{ marginTop: 8 }}>
              {["primary", "secondary", "accent", "background", "text"].map((c) => (
                <div key={c} style={{ flex: "0 0 auto" }}>
                  <label htmlFor={`${id}-${c}`} className="hint">
                    {humanize(c)}
                  </label>
                  <input id={`${id}-${c}`} type="color" value={value[c] ?? "#000000"} onChange={(e) => update([...path, c], e.target.value)} />
                </div>
              ))}
            </div>
          )}
          {errorEl}
        </fieldset>
      );
    }
    if (types.includes("object") && node.properties) {
      if (key === "wordingHi" && draft.language !== "both" && !value) return null;
      return (
        <fieldset key={p} className="stack">
          <legend>{humanize(key)}</legend>
          {sortKeys(Object.keys(node.properties)).map((k) => renderField(k, node.properties![k], value?.[k], [...path, k], (node.required ?? []).includes(k)))}
          {errorEl}
        </fieldset>
      );
    }
    if (types.includes("array") && node.items?.properties) {
      const list: any[] = Array.isArray(value) ? value : [];
      return (
        <fieldset key={p} className="stack">
          <legend>{humanize(key)}</legend>
          {list.map((item, i) => (
            <div key={i} className="card stack" style={{ marginBottom: 0 }}>
              {sortKeys(Object.keys(node.items!.properties!)).map((k) =>
                renderField(k, node.items!.properties![k], item?.[k], [...path, i, k], (node.items!.required ?? []).includes(k)),
              )}
              <button type="button" className="btn btn-danger" onClick={() => update(path, list.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => update(path, [...list, { name: "", date: draft.date ?? "", displayDate: draft.displayDate ?? "" }])}>
            + Add
          </button>
          {errorEl}
        </fieldset>
      );
    }
    if (types.includes("number") || types.includes("integer")) {
      return (
        <div key={p}>
          {label}
          <input
            id={id}
            type="number"
            inputMode="numeric"
            value={value ?? ""}
            onChange={(e) => update(path, e.target.value === "" ? undefined : Number(e.target.value))}
          />
          {errorEl}
        </div>
      );
    }
    const isDate = node.pattern?.includes("\\d{4}-\\d{2}-\\d{2}");
    return (
      <div key={p}>
        {label}
        {MULTILINE.has(key) ? (
          <textarea id={id} rows={2} value={value ?? ""} onChange={(e) => update(path, e.target.value)} />
        ) : (
          <input id={id} type={isDate ? "date" : "text"} value={value ?? ""} onChange={(e) => update(path, e.target.value)} />
        )}
        {errorEl}
      </div>
    );
  };

  const keys = sortKeys(Object.keys(schema.properties ?? {}).filter((k) => !HIDDEN.has(k)));
  const unplaced = issues.filter((i) => !keys.some((k) => i.path === k || i.path.startsWith(`${k}.`)));

  return (
    <form onSubmit={save} className="stack">
      <div>
        <label htmlFor="f-eventType">Event type</label>
        <select id="f-eventType" value={draft.eventType} onChange={(e) => changeEventType(e.target.value as EventType)}>
          {EVENT_TYPES.map((et) => (
            <option key={et} value={et}>
              {et[0].toUpperCase() + et.slice(1)}
            </option>
          ))}
        </select>
      </div>
      {keys.map((k) => renderField(k, schema.properties![k], draft[k], [k], (schema.required ?? []).includes(k)))}
      {unplaced.length > 0 && (
        <div className="alert alert-danger">
          {unplaced.map((i) => (
            <div key={i.path}>
              {i.path ? `${i.path}: ` : ""}
              {i.message}
            </div>
          ))}
        </div>
      )}
      {issues.length > 0 && <p className="error-text">Please fix the highlighted fields.</p>}
      <button className="btn btn-primary btn-block" disabled={busy || disabled}>
        {busy ? "Saving…" : saveLabel}
      </button>
    </form>
  );
}
