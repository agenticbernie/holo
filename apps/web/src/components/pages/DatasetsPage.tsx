import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { DatasetJob, DatasetParameters } from "@holo/api-client";
import { useEffect, useState } from "react";
import { holoApi } from "../../lib/api";
import { ErrorState, formatDate, getErrorMessage, PageHeader, StatusBadge } from "../ui";

const defaults: DatasetParameters = {
  products: 200,
  kocs: 80,
  campaigns: 200,
  interactions: 3000,
  coldStartRate: 0.25,
  seed: 20260806,
};

const limits: Record<keyof DatasetParameters, string> = {
  products: "1–500",
  kocs: "1–250",
  campaigns: "1–1.000",
  interactions: "100–20.000",
  coldStartRate: "0–0,5",
  seed: "Số nguyên",
};

export default function DatasetsPage() {
  const [parameters, setParameters] = useState<DatasetParameters>(defaults);
  const [job, setJob] = useState<DatasetJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return undefined;
    const timer = window.setTimeout(() => {
      holoApi
        .getDatasetJob(job.jobId)
        .then(setJob)
        .catch((reason: unknown) => setError(getErrorMessage(reason)));
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [job]);

  const createJob = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await holoApi.createDatasetJob(parameters);
      setJob(created);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  };
  const update = (key: keyof DatasetParameters, value: string) =>
    setParameters({
      ...parameters,
      [key]: key === "coldStartRate" ? Number(value) || 0 : Number(value.replace(/\D/g, "")) || 0,
    });

  return (
    <div className="holo-page holo-page--tight">
      <PageHeader
        eyebrow="Synthetic lab / versions"
        title="Tạo dữ liệu để kiểm chứng quyết định."
        description="Mỗi job mang theo seed, tham số và cảnh báo của riêng nó. Holo không dựng phần trăm tiến độ giả: trạng thái phản ánh đúng hàng đợi và kết quả backend."
        actions={<Badge label="Seed mặc định 20260806" variant="red" />}
      />
      {error && <ErrorState message={error} onRetry={() => setError(null)} />}
      <div className="section-grid section-grid--equal">
        <section className="surface">
          <div className="surface__header">
            <div>
              <div className="eyebrow">Generation input</div>
              <Heading level={2}>Tham số mô phỏng</Heading>
            </div>
          </div>
          <div className="surface__body">
            <VStack gap={3}>
              <div className="control-grid">
                <TextInput
                  label="SKU"
                  description={`Giới hạn ${limits.products}`}
                  value={String(parameters.products)}
                  onChange={(value) => update("products", value)}
                />
                <TextInput
                  label="KOC"
                  description={`Giới hạn ${limits.kocs}`}
                  value={String(parameters.kocs)}
                  onChange={(value) => update("kocs", value)}
                />
              </div>
              <div className="control-grid">
                <TextInput
                  label="Chiến dịch"
                  description={`Giới hạn ${limits.campaigns}`}
                  value={String(parameters.campaigns)}
                  onChange={(value) => update("campaigns", value)}
                />
                <TextInput
                  label="Tương tác"
                  description={`Giới hạn ${limits.interactions}`}
                  value={String(parameters.interactions)}
                  onChange={(value) => update("interactions", value)}
                />
              </div>
              <div className="control-grid">
                <TextInput
                  label="Tỷ lệ cold-start"
                  description={`Giới hạn ${limits.coldStartRate}`}
                  value={String(parameters.coldStartRate)}
                  onChange={(value) => update("coldStartRate", value)}
                />
                <TextInput
                  label="Seed"
                  description={limits.seed}
                  value={String(parameters.seed)}
                  onChange={(value) => update("seed", value)}
                />
              </div>
              <div className="form-actions">
                <Button
                  label="Đặt lại mặc định"
                  variant="ghost"
                  onClick={() => setParameters(defaults)}
                />
                <Button
                  label="Tạo job dataset"
                  variant="primary"
                  isLoading={loading}
                  onClick={createJob}
                />
              </div>
            </VStack>
          </div>
        </section>
        <section className="surface">
          <div className="surface__header">
            <div>
              <div className="eyebrow">Latest run</div>
              <Heading level={2}>Trạng thái job</Heading>
            </div>
            {job && <StatusBadge status={job.status} />}
          </div>
          <div className="surface__body">
            {job === null ? (
              <>
                <Text type="large" display="block">
                  Chưa có job trong phiên này.
                </Text>
                <Text type="body" color="secondary" display="block">
                  Tạo một job để bắt đầu mô phỏng và tải artifact từ R2.
                </Text>
              </>
            ) : (
              <VStack gap={3}>
                <dl className="detail-grid">
                  <div>
                    <dt>Job ID</dt>
                    <dd className="mono">{job.jobId}</dd>
                  </div>
                  <div>
                    <dt>Seed</dt>
                    <dd className="mono">{job.parameters.seed}</dd>
                  </div>
                  <div>
                    <dt>Cập nhật</dt>
                    <dd>{formatDate(job.updatedAt)}</dd>
                  </div>
                  <div>
                    <dt>Fallback</dt>
                    <dd>
                      {job.fallbackUsed ? (
                        <Badge label="Có dùng fallback" variant="warning" />
                      ) : (
                        <Badge label="Không" variant="success" />
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Phiên bản</dt>
                    <dd className="mono">{job.artifactKey ?? "Chưa có"}</dd>
                  </div>
                </dl>
                {(job.status === "queued" || job.status === "running") && (
                  <ProgressBar
                    label="Đang xử lý dataset"
                    value={0}
                    isIndeterminate
                    variant="accent"
                  />
                )}
                {job.status === "failed" && (
                  <Banner
                    status="error"
                    title="Job thất bại"
                    description={job.errorMessage ?? "Backend không cung cấp thêm chi tiết."}
                  />
                )}
                {job.warnings.length > 0 && (
                  <Banner
                    status="warning"
                    title="Có cảnh báo semantic fallback"
                    description="Một hoặc nhiều trường mô tả được tạo bằng template tất định. Các chỉ số mô phỏng vẫn do code sinh ra."
                  />
                )}
                {job.status === "completed" && (
                  <>
                    <Text type="label" display="block">
                      Tải artifact
                    </Text>
                    <HStack gap={2} wrap="wrap">
                      <a
                        className="download-link"
                        href={holoApi.datasetExportUrl(job.jobId, "json")}
                        download
                      >
                        JSON
                      </a>
                      <a
                        className="download-link"
                        href={holoApi.datasetExportUrl(job.jobId, "jsonl")}
                        download
                      >
                        JSONL
                      </a>
                      <a
                        className="download-link"
                        href={holoApi.datasetExportUrl(job.jobId, "csv")}
                        download
                      >
                        CSV
                      </a>
                    </HStack>
                  </>
                )}
              </VStack>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
