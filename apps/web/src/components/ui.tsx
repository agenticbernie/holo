import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HoloApiError } from "@holo/api-client";
import type { ReactNode } from "react";

export const formatMoney = (value: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number): string => new Intl.NumberFormat("vi-VN").format(value);

export const formatRate = (value: number): string =>
  `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;

export const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof HoloApiError) {
    if (error.status === 0)
      return "Không thể kết nối với Holo API. Kiểm tra kết nối mạng và thử lại.";
    if (error.status === 404) return "Dữ liệu yêu cầu không tồn tại.";
    if (error.status === 429) return "Hệ thống đang bận. Vui lòng thử lại sau ít phút.";
    if (error.status >= 500) return "Holo API đang gặp sự cố tạm thời. Vui lòng thử lại.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="holo-hero">
      <div>
        <div className="holo-hero__eyebrow">{eyebrow}</div>
        <Heading level={1} type="display-2" className="holo-hero__title">
          {title}
        </Heading>
        <Text type="large" color="secondary" display="block" className="holo-hero__description">
          {description}
        </Text>
      </div>
      <div className="hero-note">
        {actions ?? (
          <>
            <strong>Holo intelligence</strong>Biến dữ liệu thương mại thành quyết định chọn SKU và
            KOC có căn cứ.
          </>
        )}
      </div>
    </header>
  );
}

export function LoadingState({ label = "Đang tải dữ liệu" }: { label?: string }) {
  return (
    <div
      className="surface surface__body"
      style={{ display: "grid", placeItems: "center", minHeight: 180 }}
    >
      <Spinner size="md" label={label} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Banner
      status="error"
      title="Không thể tải dữ liệu"
      description={message}
      endContent={
        onRetry ? (
          <Button label="Thử lại" variant="secondary" size="sm" onClick={onRetry} />
        ) : undefined
      }
    />
  );
}

export function EmptyPanel({
  title,
  description,
  actionLabel,
  href,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <div className="surface surface__body">
      <EmptyState
        title={title}
        description={description}
        actions={
          actionLabel && href ? (
            <Link href={href} label={actionLabel}>
              {actionLabel}
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "completed" || status === "running"
      ? "success"
      : status === "failed" || status === "cancelled"
        ? "error"
        : status === "queued" || status === "scheduled"
          ? "warning"
          : "neutral";
  const labels: Record<string, string> = {
    queued: "Đang chờ",
    running: "Đang xử lý",
    completed: "Hoàn thành",
    failed: "Thất bại",
    cancelled: "Đã huỷ",
    draft: "Bản nháp",
    scheduled: "Đã lên lịch",
  };
  return <Badge label={labels[status] ?? status} variant={variant} />;
}

export function TagList({ items }: { items: readonly string[] }) {
  return (
    <div className="tag-row">
      {items.map((item) => (
        <span className="tag" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}
