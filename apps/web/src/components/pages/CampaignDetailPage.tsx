import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import type { TableColumn } from "@astryxdesign/core/Table";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Campaign, CampaignResult, CampaignResultInput } from "@holo/api-client";
import { useEffect, useState } from "react";
import { holoApi } from "../../lib/api";
import {
  ErrorState,
  formatDate,
  formatMoney,
  formatNumber,
  getErrorMessage,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "../ui";

interface Props {
  campaignId: string;
}
interface ResultRow extends Record<string, unknown> {
  resultId: string;
  skuId: string;
  kocId: string;
  views: number;
  clicks: number;
  orders: number;
  revenue: number;
  roi: number;
  scenario: string;
}

const emptyResult: CampaignResultInput = {
  skuId: "",
  kocId: "",
  views: 0,
  clicks: 0,
  orders: 0,
  returns: 0,
  sellingPrice: 0,
  stockBefore: 0,
  stockAfter: 0,
  spend: 0,
  scenario: "successful",
};

export default function CampaignDetailPage({ campaignId }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [results, setResults] = useState<CampaignResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultFormOpen, setResultFormOpen] = useState(false);
  const [resultForm, setResultForm] = useState<CampaignResultInput>(emptyResult);
  const [resultSaving, setResultSaving] = useState(false);
  const refresh = () => {
    Promise.all([holoApi.getCampaign(campaignId), holoApi.listCampaignResults(campaignId)])
      .then(([nextCampaign, resultPage]) => {
        setCampaign(nextCampaign);
        setResults(resultPage.items);
      })
      .catch((reason: unknown) => setError(getErrorMessage(reason)));
  };
  useEffect(refresh, [campaignId]);
  if (error)
    return (
      <div className="holo-page">
        <ErrorState message={error} />
      </div>
    );
  if (!campaign)
    return (
      <div className="holo-page">
        <LoadingState label="Đang tải chi tiết chiến dịch" />
      </div>
    );
  const rows: ResultRow[] = results.map((result) => ({ ...result }));
  const columns: TableColumn<ResultRow>[] = [
    {
      key: "skuId",
      header: "SKU",
      width: proportional(1),
      renderCell: (row) => <span className="mono">{row.skuId}</span>,
    },
    {
      key: "kocId",
      header: "KOC",
      width: proportional(1),
      renderCell: (row) => <span className="mono">{row.kocId}</span>,
    },
    {
      key: "views",
      header: "Views",
      width: pixel(90),
      align: "end",
      renderCell: (row) => formatNumber(row.views),
    },
    {
      key: "clicks",
      header: "Clicks",
      width: pixel(90),
      align: "end",
      renderCell: (row) => formatNumber(row.clicks),
    },
    {
      key: "orders",
      header: "Orders",
      width: pixel(90),
      align: "end",
      renderCell: (row) => formatNumber(row.orders),
    },
    {
      key: "revenue",
      header: "Revenue",
      width: pixel(130),
      align: "end",
      renderCell: (row) => formatMoney(row.revenue),
    },
    {
      key: "roi",
      header: "ROI",
      width: pixel(90),
      align: "end",
      renderCell: (row) => `${row.roi.toFixed(2)}x`,
    },
    {
      key: "scenario",
      header: "Kịch bản",
      width: proportional(1),
      renderCell: (row) => <Badge label={row.scenario} variant="neutral" />,
    },
  ];
  const saveResult = async () => {
    if (!resultForm.skuId.trim() || !resultForm.kocId.trim() || resultForm.sellingPrice <= 0)
      return;
    setResultSaving(true);
    try {
      await holoApi.createCampaignResult(campaignId, resultForm);
      setResultFormOpen(false);
      setResultForm(emptyResult);
      refresh();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setResultSaving(false);
    }
  };
  return (
    <div className="holo-page holo-page--tight">
      <PageHeader
        eyebrow="Campaign detail"
        title={campaign.name}
        description={campaign.objective}
        actions={<StatusBadge status={campaign.status} />}
      />
      <div className="section-grid">
        <section className="surface">
          <div className="surface__header">
            <div>
              <div className="eyebrow">Campaign brief</div>
              <Heading level={2}>Thông tin chiến dịch</Heading>
            </div>
            <Button
              label="Quay lại"
              variant="ghost"
              onClick={() => {
                window.location.href = "/campaigns";
              }}
            />
          </div>
          <div className="surface__body">
            <dl className="detail-grid">
              <div>
                <dt>Thời gian</dt>
                <dd>
                  {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
                </dd>
              </div>
              <div>
                <dt>Mùa</dt>
                <dd>{campaign.season}</dd>
              </div>
              <div>
                <dt>Khuyến mãi</dt>
                <dd>{Math.round(campaign.promotionRate * 100)}%</dd>
              </div>
              <div>
                <dt>Ngân sách</dt>
                <dd>{formatMoney(campaign.budget)}</dd>
              </div>
              <div>
                <dt>Campaign ID</dt>
                <dd className="mono">{campaign.campaignId}</dd>
              </div>
              <div>
                <dt>Kết quả</dt>
                <dd>{results.length.toLocaleString("vi-VN")} tương tác</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="surface">
          <div className="surface__header">
            <div>
              <div className="eyebrow">Readout</div>
              <Heading level={2}>Tín hiệu kết quả</Heading>
            </div>
          </div>
          <div className="surface__body">
            <div className="detail-grid">
              <div>
                <dt>Views</dt>
                <dd>{formatNumber(results.reduce((sum, result) => sum + result.views, 0))}</dd>
              </div>
              <div>
                <dt>Orders</dt>
                <dd>{formatNumber(results.reduce((sum, result) => sum + result.orders, 0))}</dd>
              </div>
              <div>
                <dt>Revenue</dt>
                <dd>{formatMoney(results.reduce((sum, result) => sum + result.revenue, 0))}</dd>
              </div>
            </div>
            <Text type="supporting" color="secondary" display="block" style={{ marginTop: 18 }}>
              Các chỉ số được đọc trực tiếp từ campaign results, không có aggregate giả lập ở
              frontend.
            </Text>
          </div>
        </section>
      </div>
      <div className="section-header">
        <div>
          <div className="eyebrow">Observed results</div>
          <h2>Kết quả tương tác</h2>
        </div>
        <Button
          label="+ Ghi nhận kết quả"
          variant="secondary"
          onClick={() => setResultFormOpen(true)}
        />
      </div>
      <section className="surface responsive-table">
        <div>
          <Table
            data={rows}
            columns={columns}
            idKey="resultId"
            hasHover
            density="balanced"
            dividers="rows"
          />
        </div>
      </section>
      <Dialog isOpen={resultFormOpen} onOpenChange={setResultFormOpen} width={700} purpose="form">
        <Layout
          header={
            <DialogHeader title="Ghi nhận kết quả chiến dịch" onOpenChange={setResultFormOpen} />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <div className="control-grid">
                  <TextInput
                    label="SKU ID"
                    value={resultForm.skuId}
                    onChange={(value) => setResultForm({ ...resultForm, skuId: value })}
                    isRequired
                  />
                  <TextInput
                    label="KOC ID"
                    value={resultForm.kocId}
                    onChange={(value) => setResultForm({ ...resultForm, kocId: value })}
                    isRequired
                  />
                </div>
                <div className="control-grid--three control-grid">
                  {(["views", "clicks", "orders"] as const).map((key) => (
                    <TextInput
                      key={key}
                      label={key}
                      value={String(resultForm[key])}
                      onChange={(value) =>
                        setResultForm({
                          ...resultForm,
                          [key]: Number(value.replace(/\D/g, "")) || 0,
                        })
                      }
                    />
                  ))}
                </div>
                <div className="control-grid--three control-grid">
                  <TextInput
                    label="Returns"
                    value={String(resultForm.returns)}
                    onChange={(value) =>
                      setResultForm({
                        ...resultForm,
                        returns: Number(value.replace(/\D/g, "")) || 0,
                      })
                    }
                  />
                  <TextInput
                    label="Selling price"
                    value={String(resultForm.sellingPrice || "")}
                    onChange={(value) =>
                      setResultForm({
                        ...resultForm,
                        sellingPrice: Number(value.replace(/\D/g, "")) || 0,
                      })
                    }
                    isRequired
                  />
                  <TextInput
                    label="Spend"
                    value={String(resultForm.spend || "")}
                    onChange={(value) =>
                      setResultForm({ ...resultForm, spend: Number(value.replace(/\D/g, "")) || 0 })
                    }
                  />
                </div>
                <div className="control-grid">
                  <TextInput
                    label="Stock trước"
                    value={String(resultForm.stockBefore)}
                    onChange={(value) =>
                      setResultForm({
                        ...resultForm,
                        stockBefore: Number(value.replace(/\D/g, "")) || 0,
                      })
                    }
                  />
                  <TextInput
                    label="Stock sau"
                    value={String(resultForm.stockAfter)}
                    onChange={(value) =>
                      setResultForm({
                        ...resultForm,
                        stockAfter: Number(value.replace(/\D/g, "")) || 0,
                      })
                    }
                  />
                </div>
                <TextInput
                  label="Kịch bản"
                  value={resultForm.scenario}
                  onChange={(value) => setResultForm({ ...resultForm, scenario: value })}
                  description="Ví dụ: successful, failed, promotion"
                />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Huỷ" variant="secondary" onClick={() => setResultFormOpen(false)} />
                <Button
                  label="Ghi nhận"
                  variant="primary"
                  isLoading={resultSaving}
                  onClick={saveResult}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </div>
  );
}
