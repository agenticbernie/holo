import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Campaign, Koc, Product, Recommendation } from "@holo/api-client";
import { useEffect, useState } from "react";
import { holoApi } from "../../lib/api";
import {
  ErrorState,
  formatMoney,
  formatNumber,
  formatRate,
  getErrorMessage,
  LoadingState,
  PageHeader,
  TagList,
} from "../ui";

const labels: Record<string, string> = {
  styleCompatibility: "Phù hợp phong cách",
  audienceCompatibility: "Phù hợp tệp khách hàng",
  performance: "Hiệu suất lịch sử",
  campaignFit: "Độ phù hợp chiến dịch",
  semanticCompatibility: "Tương thích ngữ nghĩa",
};

const defaultWeights = {
  styleCompatibility: 0.25,
  audienceCompatibility: 0.2,
  performance: 0.25,
  campaignFit: 0.15,
  semanticCompatibility: 0.15,
};

export default function RecommendationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [kocs, setKocs] = useState<Koc[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [skuId, setSkuId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [weights, setWeights] = useState(defaultWeights);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([holoApi.listProducts(250), holoApi.listKocs(250), holoApi.listCampaigns(250)])
      .then(([productPage, kocPage, campaignPage]) => {
        setProducts(productPage.items);
        setKocs(kocPage.items);
        setCampaigns(campaignPage.items);
        setSkuId((current) => current || productPage.items[0]?.skuId || "");
      })
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const selectedProduct = products.find((product) => product.skuId === skuId);
  const runRecommendation = async () => {
    if (!skuId) return;
    setScoring(true);
    setError(null);
    try {
      const response = await holoApi.recommend({
        skuId,
        ...(campaignId ? { campaignId } : {}),
        limit: 10,
        weights,
      });
      setResults(response.items);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setScoring(false);
    }
  };
  const kocById = new Map(kocs.map((koc) => [koc.kocId, koc]));

  return (
    <div className="holo-page holo-page--tight">
      <PageHeader
        eyebrow="Decision engine / baseline"
        title="Ai là gương mặt hợp với SKU này?"
        description="Holo xếp hạng bằng các tín hiệu quan sát được. Mỗi điểm số đều có thể đọc, so sánh và giải thích lại trước khi bạn chạy chiến dịch."
        actions={<Badge label="Reproducible scoring" variant="red" />}
      />
      {error && <ErrorState message={error} onRetry={load} />}
      {loading ? (
        <LoadingState label="Đang tải SKU, KOC và chiến dịch" />
      ) : (
        <div className="reco-layout">
          <section className="surface reco-controls">
            <div className="surface__header">
              <div>
                <div className="eyebrow">Input</div>
                <Heading level={2}>Bối cảnh đề xuất</Heading>
              </div>
            </div>
            <div className="surface__body">
              <VStack gap={4}>
                <Selector
                  label="SKU cần quảng bá"
                  options={products.map((product) => ({
                    value: product.skuId,
                    label: product.name,
                    description: `${product.brand} · ${formatMoney(product.sellingPrice)}`,
                  }))}
                  value={skuId}
                  onChange={setSkuId}
                  hasSearch
                  searchPlaceholder="Tìm SKU"
                />
                <Selector
                  label="Chiến dịch (không bắt buộc)"
                  options={campaigns.map((campaign) => ({
                    value: campaign.campaignId,
                    label: campaign.name,
                    description: `${campaign.season} · ${campaign.status}`,
                  }))}
                  value={campaignId || null}
                  onChange={(value) => setCampaignId(value ?? "")}
                  hasClear
                  placeholder="Không gắn chiến dịch"
                />
                <div>
                  <Text type="label" display="block">
                    Trọng số
                  </Text>
                  <Text type="supporting" color="secondary" display="block">
                    Điều chỉnh cách Holo cân bằng giữa phong cách, audience và hiệu suất.
                  </Text>
                  <VStack gap={3} style={{ marginTop: 14 }}>
                    {Object.entries(weights).map(([key, value]) => (
                      <div className="weight-row" key={key}>
                        <label htmlFor={`weight-${key}`} className="weight-label">
                          {labels[key] ?? key}
                        </label>
                        <input
                          id={`weight-${key}`}
                          type="range"
                          min="0"
                          max="0.5"
                          step="0.05"
                          value={value}
                          onChange={(event) =>
                            setWeights({ ...weights, [key]: Number(event.target.value) })
                          }
                        />
                        <span className="weight-value">{Math.round(value * 100)}%</span>
                      </div>
                    ))}
                  </VStack>
                </div>
                <Button
                  label="Chạy đề xuất"
                  variant="primary"
                  width="100%"
                  isLoading={scoring}
                  isDisabled={!skuId}
                  onClick={runRecommendation}
                />
              </VStack>
            </div>
          </section>
          <section>
            <div className="surface">
              <div className="surface__header">
                <div>
                  <div className="eyebrow">Decision brief</div>
                  <Heading level={2}>{selectedProduct?.name ?? "Chọn một SKU"}</Heading>
                  <Text type="supporting" color="secondary" display="block">
                    {selectedProduct
                      ? `${selectedProduct.brand} · ${formatMoney(selectedProduct.sellingPrice)} · còn ${formatNumber(selectedProduct.stock)} sản phẩm`
                      : "Chưa có dữ liệu đầu vào"}
                  </Text>
                </div>
                {selectedProduct && <TagList items={selectedProduct.styleTags} />}
              </div>
              {results.length === 0 ? (
                <div className="surface__body">
                  <div className="empty-illustration">01</div>
                  <Heading level={3}>Chưa có bảng xếp hạng</Heading>
                  <Text type="body" color="secondary" display="block">
                    Chọn SKU rồi chạy đề xuất. Kết quả sẽ hiển thị lý do phù hợp, không chỉ một con
                    số.
                  </Text>
                </div>
              ) : (
                <div>
                  {results.map((result, index) => {
                    const koc = kocById.get(result.kocId);
                    return (
                      <article className="score-card" key={result.kocId}>
                        <div className="score-card__rank">{String(index + 1).padStart(2, "0")}</div>
                        <div>
                          <div className="score-card__name">
                            {koc?.displayName ?? result.kocId}
                            {koc?.isColdStart && (
                              <span className="score-inline-badge">
                                <Badge label="Cold-start" variant="warning" />
                              </span>
                            )}
                          </div>
                          <p className="score-card__explanation">{result.explanation}</p>
                          {koc && (
                            <div className="tag-row score-tags">
                              <span className="tag">{formatNumber(koc.followers)} followers</span>
                              <span className="tag">
                                {formatRate(koc.engagementRate)} engagement
                              </span>
                              {koc.styleTags.slice(0, 2).map((tag) => (
                                <span className="tag" key={tag}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="score-card__score">
                          <small>Điểm tổng</small>
                          {Math.round(result.totalScore)}
                          <ProgressBar
                            label={`Điểm ${Math.round(result.totalScore)} trên 100`}
                            value={result.totalScore}
                            isLabelHidden
                            variant={
                              result.totalScore >= 75
                                ? "success"
                                : result.totalScore >= 50
                                  ? "warning"
                                  : "neutral"
                            }
                          />
                        </div>
                        <div className="breakdown" style={{ gridColumn: "2 / -1" }}>
                          {Object.entries(result.breakdown).map(([key, value]) => (
                            <div className="breakdown__row" key={key}>
                              <span className="breakdown__label">{labels[key] ?? key}</span>
                              <div className="breakdown__bar">
                                <span style={{ width: `${Math.min(value, 100)}%` }} />
                              </div>
                              <span className="breakdown__value">{Math.round(value)}</span>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
