import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ORDER_STATUSES = ["received", "parsing", "needs_info", "ready", "rendering", "done", "failed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const JOB_TYPES = ["parse", "render", "notify"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["queued", "running", "done", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
    rawText: text("raw_text").notNull(),
    clientName: text("client_name"),
    clientSlug: text("client_slug"),
    eventType: text("event_type"),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("received"),
    specJson: text("spec_json"),
    missingFieldsJson: text("missing_fields_json"),
    clientQuestion: text("client_question"),
    /** Template chosen by the owner at creation (null = rotate automatically). */
    templateChoice: text("template_choice"),
    /** Template actually used for the render. */
    templateId: text("template_id"),
    /** Storage key of the order folder (staging until done, then clients/<slug>/...). */
    folderKey: text("folder_key").notNull(),
    videoPath: text("video_path"),
    sharePath: text("share_path"),
    thumbPath: text("thumb_path"),
    progress: integer("progress").notNull().default(0),
    warning: text("warning"),
    error: text("error"),
    revisionOf: text("revision_of"),
    revisionRequest: text("revision_request"),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_created_idx").on(t.createdAt), index("orders_slug_idx").on(t.clientSlug)],
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type", { enum: JOB_TYPES }).notNull(),
    status: text("status", { enum: JOB_STATUSES }).notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    runAfter: text("run_after").notNull().default(now),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("jobs_pick_idx").on(t.status, t.type, t.runAfter)],
);

export const eventsLog = sqliteTable(
  "events_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    step: text("step").notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("events_order_idx").on(t.orderId)],
);

export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: integer("window_start").notNull(),
  lockedUntil: integer("locked_until").notNull().default(0),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type EventLog = typeof eventsLog.$inferSelect;
