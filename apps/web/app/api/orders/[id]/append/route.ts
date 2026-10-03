import { NextResponse } from "next/server";
import { getOrder } from "@invite/shared/db";
import { appendToOrder } from "@invite/shared/orders";
import { api, db, notFound, storage, toOrderDto } from "@/lib/api";
import { HttpError } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Add the client's reply to an order that is waiting for details; it is parsed again. */
export const POST = api<Ctx>(async (req, { params }) => {
  const order = getOrder(db(), (await params).id) ?? notFound();
  if (!["needs_info", "failed"].includes(order.status)) throw new HttpError(409, "This order is not waiting for more details");
  const body = await req.json().catch(() => null);
  const updated = await appendToOrder(db(), storage(), order, String(body?.text ?? ""));
  return NextResponse.json({ order: toOrderDto(updated) });
});
