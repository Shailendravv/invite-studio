import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import type { DB } from "./index";
import { eventsLog, jobs, orders, type Job, type JobType, type NewOrder, type Order, type OrderStatus } from "./schema";

export const MAX_JOB_ATTEMPTS = 3;

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------- orders

export function createOrder(db: DB, values: NewOrder): Order {
  return db.insert(orders).values(values).returning().get();
}

export function getOrder(db: DB, id: string): Order | undefined {
  return db.select().from(orders).where(eq(orders.id, id)).get();
}

export function listOrders(db: DB, opts: { status?: OrderStatus; limit?: number } = {}): Order[] {
  const q = db.select().from(orders);
  const filtered = opts.status ? q.where(eq(orders.status, opts.status)) : q;
  return filtered.orderBy(desc(orders.createdAt)).limit(opts.limit ?? 200).all();
}

export function updateOrder(db: DB, id: string, values: Partial<Omit<Order, "id" | "createdAt">>): Order | undefined {
  return db
    .update(orders)
    .set({ ...values, updatedAt: nowIso() })
    .where(eq(orders.id, id))
    .returning()
    .get();
}

export function deleteOrder(db: DB, id: string): void {
  db.delete(orders).where(eq(orders.id, id)).run();
}

/** Template ids already used for a client (for rotation). */
export function templatesUsedByClient(db: DB, clientSlug: string, excludeOrderId?: string): string[] {
  const rows = db
    .select({ templateId: orders.templateId, id: orders.id })
    .from(orders)
    .where(eq(orders.clientSlug, clientSlug))
    .all();
  return rows.filter((r) => r.templateId && r.id !== excludeOrderId).map((r) => r.templateId!) as string[];
}

/** How many times each template has been used overall (for rotation tie-breaks). */
export function templateUsageCounts(db: DB): Record<string, number> {
  const rows = db
    .select({ templateId: orders.templateId, n: sql<number>`count(*)` })
    .from(orders)
    .where(sql`${orders.templateId} is not null`)
    .groupBy(orders.templateId)
    .all();
  return Object.fromEntries(rows.map((r) => [r.templateId!, Number(r.n)]));
}

// ---------------------------------------------------------------- events log

export function logEvent(db: DB, orderId: string, step: string, message: string): void {
  db.insert(eventsLog).values({ orderId, step, message }).run();
}

export function listEvents(db: DB, orderId: string) {
  return db.select().from(eventsLog).where(eq(eventsLog.orderId, orderId)).orderBy(asc(eventsLog.id)).all();
}

// ---------------------------------------------------------------- jobs

export function enqueueJob(db: DB, orderId: string, type: JobType, delayMs = 0): Job {
  return db
    .insert(jobs)
    .values({ orderId, type, runAfter: new Date(Date.now() + delayMs).toISOString() })
    .returning()
    .get();
}

/** Atomically picks the oldest due job of the given types and marks it running. */
export function claimJob(db: DB, types: JobType[]): Job | undefined {
  return db.transaction(
    (tx) => {
      const job = tx
        .select()
        .from(jobs)
        .where(and(eq(jobs.status, "queued"), inArray(jobs.type, types), lte(jobs.runAfter, nowIso())))
        .orderBy(asc(jobs.runAfter), asc(jobs.id))
        .limit(1)
        .get();
      if (!job) return undefined;
      return tx
        .update(jobs)
        .set({ status: "running", attempts: job.attempts + 1 })
        .where(and(eq(jobs.id, job.id), eq(jobs.status, "queued")))
        .returning()
        .get();
    },
    { behavior: "immediate" },
  );
}

export function completeJob(db: DB, jobId: number): void {
  db.update(jobs).set({ status: "done", lastError: null }).where(eq(jobs.id, jobId)).run();
}

/** Exponential backoff: 15s, 60s, 240s ... */
export function backoffMs(attempts: number): number {
  return 15_000 * 4 ** Math.max(0, attempts - 1);
}

/**
 * Records a failure. Returns "retry" when the job was re-queued, "dead" when it
 * has used all attempts (or is not retryable).
 */
export function failJob(db: DB, job: Job, error: string, opts: { retryable?: boolean } = {}): "retry" | "dead" {
  const retryable = opts.retryable ?? true;
  if (retryable && job.attempts < MAX_JOB_ATTEMPTS) {
    db.update(jobs)
      .set({ status: "queued", lastError: error, runAfter: new Date(Date.now() + backoffMs(job.attempts)).toISOString() })
      .where(eq(jobs.id, job.id))
      .run();
    return "retry";
  }
  db.update(jobs).set({ status: "failed", lastError: error }).where(eq(jobs.id, job.id)).run();
  return "dead";
}

/** After a crash, jobs left "running" are put back in the queue. */
export function requeueStaleJobs(db: DB): number {
  return db.update(jobs).set({ status: "queued" }).where(eq(jobs.status, "running")).run().changes;
}

export function hasPendingJob(db: DB, orderId: string, type: JobType): boolean {
  return !!db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.orderId, orderId), eq(jobs.type, type), inArray(jobs.status, ["queued", "running"])))
    .get();
}

export function listJobs(db: DB, orderId: string): Job[] {
  return db.select().from(jobs).where(eq(jobs.orderId, orderId)).orderBy(asc(jobs.id)).all();
}
