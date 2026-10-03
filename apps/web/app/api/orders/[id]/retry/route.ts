import { NextResponse } from "next/server";
import { enqueueJob, getOrder, hasPendingJob, logEvent, updateOrder } from "@invite/shared/db";
import { api, db, notFound, toOrderDto } from "@/lib/api";
import { HttpError } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Re-runs a failed order from the step that failed (parse, or render when a spec exists). */
export const POST = api<Ctx>(async (_req, { params }) => {
  const order = getOrder(db(), (await params).id) ?? notFound();
  if (order.status !== "failed") throw new HttpError(409, "Only failed orders can be retried");
  let hasSpec = false;
  try {
    hasSpec = !!order.specJson && !!order.templateId && !!JSON.parse(order.specJson).templateId;
  } catch {
    hasSpec = false;
  }
  const type = hasSpec ? "render" : "parse";
  if (!hasPendingJob(db(), order.id, type)) enqueueJob(db(), order.id, type);
  const updated = updateOrder(db(), order.id, { status: hasSpec ? "ready" : "received", error: null })!;
  logEvent(db(), order.id, "retry", `Retry requested (${type})`);
  return NextResponse.json({ order: toOrderDto(updated) });
});
