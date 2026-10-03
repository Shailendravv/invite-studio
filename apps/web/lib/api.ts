import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Order } from "@invite/shared/db";
import { getDb, listEvents } from "@invite/shared/db";
import { UploadError, orderLinks } from "@invite/shared/orders";
import { getStorage, InvalidKeyError } from "@invite/shared/storage";
import { HttpError, requireApiSession } from "./auth";

export function db() {
  return getDb();
}

export function storage() {
  return getStorage();
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps an authenticated API handler with consistent JSON errors. */
export function api<C>(handler: Handler<C>, opts: { public?: boolean } = {}): Handler<C> {
  return async (req, ctx) => {
    try {
      if (!opts.public) await requireApiSession(req);
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof UploadError || e instanceof InvalidKeyError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: "Some fields are invalid", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
          { status: 422 },
        );
      }
      console.error(e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export function notFound(): never {
  throw new HttpError(404, "Order not found");
}

function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/** What the browser sees: no filesystem paths, only signed links. */
export function toOrderDto(order: Order, opts: { events?: boolean } = {}) {
  const links = order.status === "done" ? orderLinks(storage(), order) : {};
  return {
    id: order.id,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    rawText: order.rawText,
    clientName: order.clientName,
    eventType: order.eventType,
    status: order.status,
    spec: parseJson<Record<string, unknown>>(order.specJson),
    missingFields: parseJson<string[]>(order.missingFieldsJson) ?? [],
    clientQuestion: order.clientQuestion,
    templateChoice: order.templateChoice,
    templateId: order.templateId,
    progress: order.progress,
    warning: order.warning,
    error: order.error,
    revisionOf: order.revisionOf,
    revisionRequest: order.revisionRequest,
    links,
    events: opts.events ? listEvents(db(), order.id).map((e) => ({ id: e.id, step: e.step, message: e.message, createdAt: e.createdAt })) : undefined,
  };
}

export type OrderDto = ReturnType<typeof toOrderDto>;
