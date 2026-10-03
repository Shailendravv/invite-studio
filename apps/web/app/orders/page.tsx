import { ORDER_STATUSES, listOrders, type OrderStatus } from "@invite/shared/db";
import { eventLabel } from "@invite/shared/format";
import { db, storage } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { AutoRefresh, StatusBadge, STATUS_LABEL, TimeAgo } from "@/components/bits";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePageSession();
  const { status } = await searchParams;
  const filter = status && (ORDER_STATUSES as readonly string[]).includes(status) ? (status as OrderStatus) : undefined;
  const orders = listOrders(db(), { status: filter });
  const s = storage();
  return (
    <>
      <AutoRefresh ms={5000} />
      <h1>Orders</h1>
      <nav className="filters" aria-label="Filter by status">
        <a href="/orders" aria-current={!filter ? "true" : undefined}>
          All
        </a>
        {ORDER_STATUSES.map((st) => (
          <a key={st} href={`/orders?status=${st}`} aria-current={filter === st ? "true" : undefined}>
            {STATUS_LABEL[st]}
          </a>
        ))}
      </nav>
      {orders.length === 0 ? (
        <div className="empty card">
          <p>No orders{filter ? ` with status “${STATUS_LABEL[filter]}”` : " yet"}.</p>
          <a className="btn btn-primary" href="/">
            Create an order
          </a>
        </div>
      ) : (
        <ul className="order-list">
          {orders.map((o) => {
            const thumb = o.thumbPath ? s.createSignedUrl(o.thumbPath, { ttlHours: 2 }) : null;
            return (
              <li key={o.id}>
                <a className="order-item" href={`/orders/${o.id}`}>
                  {thumb ? <img className="thumb" src={thumb} alt="" loading="lazy" /> : <span className="thumb" aria-hidden />}
                  <span className="order-meta">
                    <span className="order-title">{o.clientName || o.rawText.slice(0, 60)}</span>
                    <span className="order-sub">
                      {o.eventType ? eventLabel(o.eventType) : "Event"}
                      {o.revisionOf ? " · revision" : ""} · <TimeAgo iso={o.createdAt} />
                    </span>
                    <span style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <StatusBadge status={o.status} />
                      {o.status === "rendering" && <span className="hint">{o.progress}%</span>}
                      {o.warning && <span className="badge badge-needs_info">Check</span>}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
