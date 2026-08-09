import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Pagination } from "@astryxdesign/core/Pagination";
import type { TableColumn } from "@astryxdesign/core/Table";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Koc, KocInput } from "@holo/api-client";
import { useEffect, useState } from "react";
import { holoApi } from "../../lib/api";
import {
  ErrorState,
  formatNumber,
  formatRate,
  getErrorMessage,
  LoadingState,
  PageHeader,
  TagList,
} from "../ui";

interface KocRow extends Record<string, unknown> {
  kocId: string;
  displayName: string;
  bio: string;
  followers: number;
  averageViews: number;
  engagementRate: number;
  historicalConversionRate: number;
  styleTags: readonly string[];
  isColdStart: boolean;
}

const emptyForm: KocInput = {
  displayName: "",
  bio: "",
  followers: 0,
  averageViews: 0,
  engagementRate: 0,
  historicalConversionRate: 0,
  audienceProfile: { ageRange: "25-34", genders: ["female"], regions: ["urban"], interests: [] },
  styleTags: [],
  isColdStart: true,
};

export default function KocsPage() {
  const [kocs, setKocs] = useState<Koc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<KocInput>(emptyForm);
  const [editing, setEditing] = useState<Koc | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Koc | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    holoApi
      .listKocs(50, (page - 1) * 50)
      .then((result) => {
        setKocs(result.items);
        setTotal(result.meta.total);
      })
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  };
  useEffect(load, [page]);
  const visible = kocs.filter((koc) =>
    `${koc.displayName} ${koc.kocId} ${koc.bio} ${koc.styleTags.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };
  const openEdit = (koc: Koc) => {
    setEditing(koc);
    setForm({
      displayName: koc.displayName,
      bio: koc.bio,
      followers: koc.followers,
      averageViews: koc.averageViews,
      engagementRate: koc.engagementRate,
      historicalConversionRate: koc.historicalConversionRate,
      audienceProfile: {
        ...koc.audienceProfile,
        genders: [...koc.audienceProfile.genders],
        regions: [...koc.audienceProfile.regions],
        interests: [...koc.audienceProfile.interests],
      },
      styleTags: [...koc.styleTags],
      isColdStart: koc.isColdStart,
    });
    setFormOpen(true);
  };
  const save = async () => {
    if (!form.displayName.trim() || form.styleTags.length === 0) return;
    setSaving(true);
    try {
      if (editing) await holoApi.updateKoc(editing.kocId, form);
      else await holoApi.createKoc(form);
      setFormOpen(false);
      load();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await holoApi.deleteKoc(deleteTarget.kocId);
      setDeleteTarget(null);
      load();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setDeleteLoading(false);
    }
  };
  const rows: KocRow[] = visible.map((koc) => ({ ...koc, styleTags: koc.styleTags }));
  const columns: TableColumn<KocRow>[] = [
    {
      key: "displayName",
      header: "KOC",
      width: proportional(1.8),
      renderCell: (row) => (
        <div>
          <strong>{row.displayName}</strong>
          <span className="table-subtext">{row.bio}</span>
          <span className="table-subtext mono">{row.kocId}</span>
        </div>
      ),
    },
    {
      key: "followers",
      header: "Followers",
      width: pixel(104),
      align: "end",
      renderCell: (row) => formatNumber(row.followers),
    },
    {
      key: "averageViews",
      header: "Views TB",
      width: pixel(104),
      align: "end",
      renderCell: (row) => formatNumber(row.averageViews),
    },
    {
      key: "engagementRate",
      header: "Engagement",
      width: pixel(108),
      align: "end",
      renderCell: (row) => formatRate(row.engagementRate),
    },
    {
      key: "historicalConversionRate",
      header: "Conversion",
      width: pixel(108),
      align: "end",
      renderCell: (row) => formatRate(row.historicalConversionRate),
    },
    {
      key: "styleTags",
      header: "Phong cách",
      width: proportional(1.25),
      renderCell: (row) => <TagList items={row.styleTags} />,
    },
    {
      key: "isColdStart",
      header: "Tín hiệu",
      width: pixel(112),
      renderCell: (row) =>
        row.isColdStart ? (
          <Badge label="Cold-start" variant="warning" />
        ) : (
          <Badge label="Có lịch sử" variant="success" />
        ),
    },
    {
      key: "actions",
      header: "",
      width: pixel(132),
      renderCell: (row) => {
        const item = kocs.find((candidate) => candidate.kocId === row.kocId);
        return (
          <HStack gap={1} hAlign="end">
            <Button label="Sửa" variant="ghost" size="sm" onClick={() => item && openEdit(item)} />
            <Button
              label="Xoá"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(item ?? null)}
            />
          </HStack>
        );
      },
    },
  ];

  return (
    <div className="holo-page holo-page--tight">
      <PageHeader
        eyebrow="Creator graph / KOC"
        title="Hiểu người đứng sau tệp khán giả."
        description="Một hồ sơ KOC tốt không chỉ là followers. Holo giữ lại phong cách, audience và tín hiệu chuyển đổi để so khớp có căn cứ."
        actions={<Button label="+ Tạo KOC" variant="primary" onClick={openCreate} />}
      />
      <section className="section-header">
        <div>
          <div className="eyebrow">Creator registry</div>
          <h2>{total.toLocaleString("vi-VN")} hồ sơ</h2>
        </div>
        <Text type="supporting" color="secondary">
          Cold-start được đánh dấu riêng
        </Text>
      </section>
      {error && <ErrorState message={error} onRetry={load} />}
      {loading ? (
        <LoadingState label="Đang tải hồ sơ KOC" />
      ) : kocs.length === 0 ? (
        <div className="surface surface__body">
          <Text type="large">Chưa có KOC nào.</Text>
          <Text type="body" color="secondary" display="block">
            Thêm hồ sơ để Holo bắt đầu tìm các kết hợp tiềm năng.
          </Text>
        </div>
      ) : (
        <>
          <div className="table-toolbar">
            <div className="table-toolbar__search">
              <TextInput
                label="Tìm KOC"
                isLabelHidden
                value={search}
                onChange={setSearch}
                placeholder="Tên, mã KOC hoặc phong cách"
                hasClear
              />
            </div>
          </div>
          <section className="surface responsive-table">
            <div>
              <Table
                data={rows}
                columns={columns}
                idKey="kocId"
                hasHover
                density="balanced"
                dividers="rows"
                textOverflow="truncate"
                rowIndexStart={(page - 1) * 50 + 1}
                rowCount={total}
              />
            </div>
          </section>
          {total > 50 && (
            <div className="pagination-wrap">
              <Pagination
                page={page}
                onChange={setPage}
                totalItems={total}
                pageSize={50}
                variant="count"
                label="Phân trang KOC"
              />
            </div>
          )}
        </>
      )}
      <Dialog isOpen={formOpen} onOpenChange={setFormOpen} width={640} purpose="form">
        <Layout
          header={
            <DialogHeader
              title={editing ? "Sửa hồ sơ KOC" : "Tạo hồ sơ KOC"}
              onOpenChange={setFormOpen}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <div className="control-grid">
                  <TextInput
                    label="Tên hiển thị"
                    value={form.displayName}
                    onChange={(value) => setForm({ ...form, displayName: value })}
                    isRequired
                  />
                  <TextInput
                    label="Followers"
                    value={String(form.followers || "")}
                    onChange={(value) =>
                      setForm({ ...form, followers: Number(value.replace(/\D/g, "")) || 0 })
                    }
                  />
                </div>
                <TextInput
                  label="Bio"
                  value={form.bio}
                  onChange={(value) => setForm({ ...form, bio: value })}
                />
                <div className="control-grid">
                  <TextInput
                    label="Views trung bình"
                    value={String(form.averageViews || "")}
                    onChange={(value) =>
                      setForm({ ...form, averageViews: Number(value.replace(/\D/g, "")) || 0 })
                    }
                  />
                  <TextInput
                    label="Engagement rate"
                    description="Ví dụ: 0.08 = 8%"
                    value={String(form.engagementRate || "")}
                    onChange={(value) => setForm({ ...form, engagementRate: Number(value) || 0 })}
                  />
                </div>
                <div className="control-grid">
                  <TextInput
                    label="Conversion lịch sử"
                    description="Ví dụ: 0.02 = 2%"
                    value={String(form.historicalConversionRate || "")}
                    onChange={(value) =>
                      setForm({ ...form, historicalConversionRate: Number(value) || 0 })
                    }
                  />
                  <TextInput
                    label="Phong cách"
                    description="Phân tách bằng dấu phẩy"
                    value={form.styleTags.join(", ")}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        styleTags: value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    isRequired
                  />
                </div>
                <div className="control-grid">
                  <TextInput
                    label="Độ tuổi audience"
                    value={form.audienceProfile.ageRange}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        audienceProfile: { ...form.audienceProfile, ageRange: value },
                      })
                    }
                  />
                  <TextInput
                    label="Sở thích audience"
                    description="Phân tách bằng dấu phẩy"
                    value={form.audienceProfile.interests.join(", ")}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        audienceProfile: {
                          ...form.audienceProfile,
                          interests: value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Huỷ" variant="secondary" onClick={() => setFormOpen(false)} />
                <Button
                  label={editing ? "Lưu thay đổi" : "Tạo KOC"}
                  variant="primary"
                  isLoading={saving}
                  onClick={save}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
      <AlertDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xoá hồ sơ KOC?"
        description={`Hồ sơ “${deleteTarget?.displayName ?? "này"}” sẽ bị xoá khỏi hệ thống.`}
        actionLabel="Xoá KOC"
        isActionLoading={deleteLoading}
        onAction={remove}
      />
    </div>
  );
}
