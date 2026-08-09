import { Badge } from "@astryxdesign/core/Badge";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Campaign, Koc, Product } from "@holo/api-client";
import { useEffect, useState } from "react";
import { holoApi } from "../../lib/api";
import {
  ErrorState,
  formatDate,
  formatNumber,
  getErrorMessage,
  LoadingState,
  PageHeader,
} from "../ui";

type Health = { status: "ok"; service: string; environment: string; requestId: string };

interface OverviewData {
  health: Health;
  products: { items: Product[]; meta: { total: number } };
  kocs: { items: Koc[]; meta: { total: number } };
  campaigns: { items: Campaign[]; meta: { total: number } };
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    Promise.all([
      holoApi.health(),
      holoApi.listProducts(),
      holoApi.listKocs(),
      holoApi.listCampaigns(),
    ])
      .then(([health, products, kocs, campaigns]) => setData({ health, products, kocs, campaigns }))
      .catch((reason: unknown) => setError(getErrorMessage(reason)));
  };

  useEffect(load, []);

  return (
    <div className="holo-page">
      <PageHeader
        eyebrow="Holo / control room"
        title="Nhìn rõ quyết định tiếp theo."
        description="Một mặt phẳng vận hành cho SKU, KOC và chiến dịch. Bắt đầu bằng dữ liệu có thật, sau đó để Holo chỉ ra cặp kết hợp đáng thử nhất."
      />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data === null ? (
        <LoadingState label="Đang tổng hợp workspace" />
      ) : (
        <>
          <section className="metric-strip" aria-label="Tổng quan workspace">
            <div className="metric">
              <span className="metric__label">SKU đang quản lý</span>
              <strong className="metric__value">{formatNumber(data.products.meta.total)}</strong>
              <span className="metric__detail">Danh mục có thể bán</span>
            </div>
            <div className="metric">
              <span className="metric__label">Hồ sơ KOC</span>
              <strong className="metric__value">{formatNumber(data.kocs.meta.total)}</strong>
              <span className="metric__detail">Tín hiệu audience đã nhập</span>
            </div>
            <div className="metric">
              <span className="metric__label">Chiến dịch</span>
              <strong className="metric__value">{formatNumber(data.campaigns.meta.total)}</strong>
              <span className="metric__detail">Các vòng ra mắt đã ghi nhận</span>
            </div>
            <div className="metric">
              <span className="metric__label">API trạng thái</span>
              <strong className="metric__value">●</strong>
              <span className="metric__detail">
                {data.health.environment} · request {data.health.requestId.slice(0, 12)}
              </span>
            </div>
          </section>
          <div className="section-grid">
            <section className="surface">
              <div className="surface__header">
                <div>
                  <div className="eyebrow">Bước tiếp theo</div>
                  <Heading level={2}>Tìm KOC phù hợp cho SKU</Heading>
                </div>
                <Badge label="Baseline tất định" variant="red" />
              </div>
              <div className="surface__body">
                <Text type="large" color="secondary" display="block">
                  Chọn một SKU, thêm ngữ cảnh chiến dịch nếu có, rồi xem điểm tổng hợp cùng lý do
                  Holo đề xuất từng KOC.
                </Text>
                <a className="holo-action-link" href="/recommendations">
                  Mở workspace đề xuất <span aria-hidden="true">↗</span>
                </a>
              </div>
            </section>
            <section className="surface">
              <div className="surface__header">
                <div>
                  <div className="eyebrow">Tín hiệu hệ thống</div>
                  <Heading level={2}>API trực tiếp</Heading>
                </div>
                <Badge label="Online" variant="success" />
              </div>
              <div className="surface__body">
                <Text type="body" color="secondary" display="block">
                  Dữ liệu trong màn hình này được đọc từ Holo API production, không có dữ liệu demo
                  được cài cứng.
                </Text>
                <a
                  className="holo-text-link"
                  href="https://holo-api.hackonteam.workers.dev/docs"
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở tài liệu API ↗
                </a>
              </div>
            </section>
          </div>
          <div className="section-header">
            <div>
              <div className="eyebrow">Nhịp vận hành</div>
              <h2>Chiến dịch gần đây</h2>
            </div>
            <a className="holo-text-link" href="/campaigns">
              Xem tất cả
            </a>
          </div>
          <section className="surface responsive-table">
            <div>
              <table className="holo-native-table">
                <thead>
                  <tr>
                    <th>Tên chiến dịch</th>
                    <th>Thời gian</th>
                    <th>Mùa</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.items.slice(0, 5).map((campaign) => (
                    <tr key={campaign.campaignId}>
                      <td>
                        <strong>{campaign.name}</strong>
                        <span className="table-subtext">{campaign.objective}</span>
                      </td>
                      <td>
                        {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
                      </td>
                      <td>
                        <span className="tag">{campaign.season}</span>
                      </td>
                      <td>
                        <Badge
                          label={campaign.status}
                          variant={
                            campaign.status === "completed"
                              ? "success"
                              : campaign.status === "running"
                                ? "info"
                                : "neutral"
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
