import { notFound } from "next/navigation";
import { z } from "zod";
import { getOrder } from "@invite/shared/db";
import { BirthdaySpecSchema, EngagementSpecSchema, WeddingSpecSchema } from "@invite/shared/schema";
import { db, toOrderDto } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { OrderView } from "@/components/OrderView";

export const dynamic = "force-dynamic";

/** JSON Schemas generated from the shared zod schemas drive the edit form. */
const schemas = {
  birthday: z.toJSONSchema(BirthdaySpecSchema),
  engagement: z.toJSONSchema(EngagementSpecSchema),
  wedding: z.toJSONSchema(WeddingSpecSchema),
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession();
  const order = getOrder(db(), (await params).id);
  if (!order) notFound();
  return <OrderView initial={toOrderDto(order, { events: true })} schemas={schemas as Record<string, JsonSchema>} />;
}

type JsonSchema = Record<string, unknown>;
