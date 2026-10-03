import { NextResponse } from "next/server";
import { getOrder } from "@invite/shared/db";
import { deleteOrderAndFiles } from "@invite/shared/orders";
import { api, db, notFound, storage, toOrderDto } from "@/lib/api";
import { HttpError } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = api<Ctx>(async (_req, { params }) => {
  const order = getOrder(db(), (await params).id) ?? notFound();
  return NextResponse.json({ order: toOrderDto(order, { events: true }) });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  const order = getOrder(db(), (await params).id) ?? notFound();
  if (order.status === "rendering") throw new HttpError(409, "Wait for the render to finish before deleting");
  await deleteOrderAndFiles(db(), storage(), order);
  return NextResponse.json({ ok: true });
});
