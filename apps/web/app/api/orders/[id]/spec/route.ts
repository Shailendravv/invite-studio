import { NextResponse } from "next/server";
import { getOrder } from "@invite/shared/db";
import { applySpecAndQueueRender } from "@invite/shared/orders";
import { EventSpecSchema } from "@invite/shared/schema";
import { api, db, notFound, storage, toOrderDto } from "@/lib/api";
import { HttpError } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Owner edits the spec: validate, save, re-render. */
export const PATCH = api<Ctx>(async (req, { params }) => {
  const order = getOrder(db(), (await params).id) ?? notFound();
  if (["parsing", "rendering"].includes(order.status)) throw new HttpError(409, "Please wait until the current step finishes");
  const body = await req.json().catch(() => null);
  const spec = EventSpecSchema.parse(body?.spec);
  // Photos/audio are managed by uploads, never by the form.
  const current = order.specJson ? JSON.parse(order.specJson) : {};
  const merged = EventSpecSchema.parse({ ...spec, photos: current.photos, audio: current.audio });
  const updated = await applySpecAndQueueRender(db(), storage(), order, merged, "Spec edited by owner. Queued for rendering.");
  return NextResponse.json({ order: toOrderDto(updated) });
});
