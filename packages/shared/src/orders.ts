// Order operations shared by the web app and the worker / scripts.
import path from "node:path";
import type { DB } from "./db";
import * as repo from "./db/repo";
import type { Order } from "./db/schema";
import { clientDisplayName, eventLabel } from "./format";
import { newId } from "./ids";
import { EventSpecSchema, type EventSpec } from "./schema";
import { slugify } from "./slug";
import type { StorageAdapter } from "./storage/types";
import { FILES, fileKey, stagingFolder } from "./storage/layout";

export const UPLOAD_LIMITS = {
  image: 10 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  maxFiles: 8,
  maxRawText: 20_000,
};

const SIGNATURES: { kind: "image" | "audio"; mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { kind: "image", mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { kind: "image", mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { kind: "image", mime: "image/webp", ext: "webp", test: (b) => b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" },
  { kind: "audio", mime: "audio/mpeg", ext: "mp3", test: (b) => b.toString("latin1", 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { kind: "audio", mime: "audio/mp4", ext: "m4a", test: (b) => b.toString("latin1", 4, 8) === "ftyp" },
  { kind: "audio", mime: "audio/wav", ext: "wav", test: (b) => b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WAVE" },
  { kind: "audio", mime: "audio/ogg", ext: "ogg", test: (b) => b.toString("latin1", 0, 4) === "OggS" },
];

const ALLOWED_DECLARED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
]);

export interface IncomingFile {
  name: string;
  type: string;
  data: Buffer;
}

export interface AcceptedFile {
  kind: "image" | "audio";
  fileName: string;
  data: Buffer;
}

export class UploadError extends Error {}

/** Allow-list by declared MIME *and* file signature; enforce size limits. */
export function validateUploads(files: IncomingFile[]): AcceptedFile[] {
  if (files.length > UPLOAD_LIMITS.maxFiles) throw new UploadError(`At most ${UPLOAD_LIMITS.maxFiles} files per order`);
  let audioCount = 0;
  return files.map((f, i) => {
    const declared = (f.type || "").toLowerCase();
    const sig = SIGNATURES.find((s) => s.test(f.data));
    if (!ALLOWED_DECLARED.has(declared) || !sig || !declared.startsWith(sig.kind)) {
      throw new UploadError(`"${f.name}" is not an allowed photo (JPG, PNG, WebP) or audio (MP3, M4A, WAV, OGG) file`);
    }
    const limit = UPLOAD_LIMITS[sig.kind];
    if (f.data.length > limit) throw new UploadError(`"${f.name}" is larger than ${limit / 1024 / 1024} MB`);
    if (sig.kind === "audio" && ++audioCount > 1) throw new UploadError("Only one audio file per order");
    // Our own file names: never trust the client's.
    const fileName = sig.kind === "audio" ? `audio.${sig.ext}` : `photo-${String(i + 1).padStart(2, "0")}.${sig.ext}`;
    return { kind: sig.kind, fileName, data: f.data };
  });
}

export function isAudioFile(name: string): boolean {
  return /\.(mp3|m4a|wav|ogg|aac)$/i.test(name);
}

export function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

export async function createOrderWithFiles(
  db: DB,
  storage: StorageAdapter,
  args: { rawText: string; templateChoice?: string | null; files?: AcceptedFile[]; revisionOf?: string; revisionRequest?: string },
): Promise<Order> {
  const rawText = args.rawText.trim();
  if (!rawText) throw new UploadError("Paste the client's message first");
  if (rawText.length > UPLOAD_LIMITS.maxRawText) throw new UploadError("Message is too long");
  const id = newId();
  const folder = stagingFolder(id);
  // Raw text is saved before anything else can fail.
  await storage.put(fileKey(folder, FILES.raw), rawText);
  for (const f of args.files ?? []) await storage.put(`${folder}/${FILES.uploads}/${f.fileName}`, f.data);
  const order = repo.createOrder(db, {
    id,
    rawText,
    folderKey: folder,
    templateChoice: args.templateChoice || null,
    revisionOf: args.revisionOf ?? null,
    revisionRequest: args.revisionRequest ?? null,
  });
  repo.logEvent(db, id, "received", args.revisionOf ? `Revision of ${args.revisionOf}: ${args.revisionRequest}` : "Order created");
  repo.enqueueJob(db, id, "parse");
  return order;
}

/**
 * Validates a spec, stores it on the order (and as spec.json), marks the order
 * ready and queues a render. Used by the worker after parsing and by the
 * owner's edit form. Throws a ZodError when the spec is invalid.
 */
export async function applySpecAndQueueRender(db: DB, storage: StorageAdapter, order: Order, spec: EventSpec, note?: string): Promise<Order> {
  const valid = EventSpecSchema.parse(spec);
  const clientName = clientDisplayName(valid);
  const updated = repo.updateOrder(db, order.id, {
    status: "ready",
    specJson: JSON.stringify(valid),
    eventType: valid.eventType,
    clientName,
    clientSlug: slugify(clientName),
    templateId: valid.templateId,
    missingFieldsJson: null,
    clientQuestion: null,
    error: null,
    progress: 0,
  })!;
  await storage.put(fileKey(order.folderKey, FILES.spec), JSON.stringify(valid, null, 2));
  repo.logEvent(db, order.id, "ready", note ?? `Spec ready, template ${valid.templateId}. Queued for rendering.`);
  if (!repo.hasPendingJob(db, order.id, "render")) repo.enqueueJob(db, order.id, "render");
  return updated;
}

/** Owner adds the client's reply to an order waiting for info; it is parsed again. */
export async function appendToOrder(db: DB, storage: StorageAdapter, order: Order, text: string): Promise<Order> {
  const extra = text.trim();
  if (!extra) throw new UploadError("Paste the client's reply first");
  const rawText = `${order.rawText}\n\n${extra}`;
  if (rawText.length > UPLOAD_LIMITS.maxRawText) throw new UploadError("Message is too long");
  await storage.put(fileKey(order.folderKey, FILES.raw), rawText);
  const updated = repo.updateOrder(db, order.id, { rawText, status: "received", error: null, clientQuestion: null })!;
  repo.logEvent(db, order.id, "append", "Client reply added");
  if (!repo.hasPendingJob(db, order.id, "parse")) repo.enqueueJob(db, order.id, "parse");
  return updated;
}

/** A revision is a new order (old videos are kept) that copies the parent's uploads. */
export async function createRevision(db: DB, storage: StorageAdapter, parent: Order, instruction: string): Promise<Order> {
  const request = instruction.trim();
  if (!request) throw new UploadError("Describe the change first");
  if (!parent.specJson || !["done", "ready", "failed", "rendering"].includes(parent.status)) {
    throw new UploadError("Only orders with a complete spec can be revised");
  }
  const uploads = await storage.list(`${parent.folderKey}/${FILES.uploads}`);
  const files: AcceptedFile[] = [];
  for (const u of uploads) {
    const name = path.posix.basename(u.key);
    files.push({ kind: isAudioFile(name) ? "audio" : "image", fileName: name, data: await storage.get(u.key) });
  }
  return createOrderWithFiles(db, storage, {
    rawText: parent.rawText,
    templateChoice: parent.templateId,
    files,
    revisionOf: parent.id,
    revisionRequest: request,
  });
}

export async function deleteOrderAndFiles(db: DB, storage: StorageAdapter, order: Order): Promise<void> {
  await storage.delete(`${order.folderKey}/`);
  repo.deleteOrder(db, order.id);
}

export interface OrderLinks {
  video?: string;
  share?: string;
  thumb?: string;
}

/** Signed, expiring links for an order's outputs (never raw paths). */
export function orderLinks(storage: StorageAdapter, order: Order, ttlHours?: number): OrderLinks {
  const base = `${(order.clientSlug ?? "invitation").replace(/[^a-z0-9-]/g, "")}-${eventLabel(order.eventType).toLowerCase()}`;
  return {
    video: order.videoPath ? storage.createSignedUrl(order.videoPath, { ttlHours, downloadName: `${base}.mp4` }) : undefined,
    share: order.sharePath ? storage.createSignedUrl(order.sharePath, { ttlHours, downloadName: `${base}-whatsapp.mp4` }) : undefined,
    thumb: order.thumbPath ? storage.createSignedUrl(order.thumbPath, { ttlHours, downloadName: `${base}.png` }) : undefined,
  };
}
