import { NextResponse } from "next/server";
import { ORDER_STATUSES, listOrders, type OrderStatus } from "@invite/shared/db";
import { createOrderWithFiles, validateUploads, type IncomingFile } from "@invite/shared/orders";
import { getTemplate } from "@invite/shared/templates";
import { api, db, storage, toOrderDto } from "@/lib/api";
import { HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = api(async (req) => {
  const status = new URL(req.url).searchParams.get("status");
  const filter = status && (ORDER_STATUSES as readonly string[]).includes(status) ? (status as OrderStatus) : undefined;
  return NextResponse.json({ orders: listOrders(db(), { status: filter }).map((o) => toOrderDto(o)) });
});

export const POST = api(async (req) => {
  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Could not read the form (files too large?)");
  });
  const rawText = String(form.get("rawText") ?? "");
  const templateChoice = String(form.get("templateChoice") ?? "") || null;
  if (templateChoice && !getTemplate(templateChoice)) throw new HttpError(400, "Unknown template");
  const incoming: IncomingFile[] = [];
  for (const entry of form.getAll("files")) {
    if (typeof entry === "string" || entry.size === 0) continue;
    incoming.push({ name: entry.name, type: entry.type, data: Buffer.from(await entry.arrayBuffer()) });
  }
  const files = validateUploads(incoming);
  const order = await createOrderWithFiles(db(), storage(), { rawText, templateChoice, files });
  return NextResponse.json({ order: toOrderDto(order) }, { status: 201 });
});
