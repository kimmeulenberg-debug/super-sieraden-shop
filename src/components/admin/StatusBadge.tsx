import clsx from "clsx";
import type { OrderStatus } from "@/lib/orders";

/**
 * Kleurcodering per orderstatus, gebruikt in zowel de orderlijst als het
 * orderdetail in het admin-dashboard.
 */
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "In afwachting",
  shipped: "Verzonden",
  delivered: "Bezorgd",
  cancelled: "Geannuleerd",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-champagne text-[#8a6d1a]",
  shipped: "bg-ijsblauw text-[#2d5a8a]",
  delivered: "bg-mintgroen text-[#1f7a4d]",
  cancelled: "bg-roze-zacht text-[#9c2b4f]",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
