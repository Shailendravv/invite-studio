import { NextResponse } from "next/server";
import { getOrder } from "@invite/shared/db";
import { createRevision } from "@invite/shared/orders";
import { api, db, notFound, storage, toOrderDto } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Creates a new order with revision_of set; the old video is kept. */
export const POST = api<Ctx>(async (req, { params }) => {
  const parent = getOrder(db(), (await params).id) ?? notFound();
  const body = await req.json().catch(() => null);
  const order = await createRevision(db(), storage(), parent, String(body?.instruction ?? ""));
  return NextResponse.json({ order: toOrderDto(order) }, { status: 201 });
});
