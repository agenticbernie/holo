import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import type { TableColumn } from "@astryxdesign/core/Table";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Campaign, CampaignInput } from "@holo/api-client";
import { useEffect, useState } from "react";
import { holoApi } from "../../lib/api";
import {
  ErrorState,
  formatDate,
  formatMoney,
  getErrorMessage,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "../ui";

interface CampaignRow extends Record<string, unknown> {
  campaignId: string;
  name: string;
  objective: string;
  startDate: string;
  endDate: string;
  promotionRate: number;
  season: string;
  status: Campaign["status"];
  budget: number;
}

const statuses = ["draft", "scheduled", "running", "completed", "cancelled"];
const emptyForm: CampaignInput = {
  name: "",
  objective: "",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  promotionRate: 0,
  season: "summer",
  status: "draft",
  budget: 0,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CampaignInput>(emptyForm);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    holoApi
      .listCampaigns()
      .then((result) => setCampaigns(result.items))
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const visible = campaigns.filter((campaign) =>
    `${campaign.name} ${campaign.objective} ${campaign.season}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };
  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setForm({
      name: campaign.name,
      objective: campaign.objective,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      promotionRate: campaign.promotionRate,
      season: campaign.season,
      status: campaign.status,
      budget: campaign.budget,
    });
    setFormOpen(true);
  };
  const save = async () => {
    if (!form.name.trim() || !form.objective.trim()) return;
    setSaving(true);
    try {
      if (editing) await holoApi.updateCampaign(editing.campaignId, form);
      else await holoApi.createCampaign(form);
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
      await holoApi.deleteCampaign(deleteTarget.campaignId);
      setDeleteTarget(null);
      load();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setDeleteLoading(false);
    }
  };
  const rows: CampaignRow[] = visible.map((campaign) => ({ ...campaign }));
  const columns: TableColumn<CampaignRow>[] = [
    {
      key: "name",
      header: "Chiến dịch",
      width: proportional(1.7),
      renderCell: (row) => (
        <div>
          <a className="table-link" href={`/campaigns/${row.campaignId}`}>
            {row.name}
          </a>
          <span className="table-subtext">{row.objective}</span>
        </div>
      ),
    },
    {
      key: "startDate",
      header: "Thời gian",
      width: proportional(1.35),
      renderCell: (row) => `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
    },
    {
      key: "season",
      header: "Mùa",
      width: proportional(0.7),
      renderCell: (row) => <span className="tag">{row.season}</span>,
    },
    {
      key: "promotionRate",
      header: "Khuyến mãi",
      width: pixel(104),
      align: "end",
      renderCell: (row) => `${Math.round(row.promotionRate * 100)}%`,
    },
    {
      key: "budget",
      header: "Ngân sách",
      width: pixel(130),
      align: "end",
      renderCell: (row) => formatMoney(row.budget),
    },
    {
      key: "status",
      header: "Trạng thái",
      width: pixel(120),
      renderCell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      width: pixel(132),
      renderCell: (row) => {
        const item = campaigns.find((candidate) => candidate.campaignId === row.campaignId);
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
        eyebrow="Campaign desk"
        title="Đưa dữ liệu vào đúng mùa."
        description="Theo dõi mục tiêu, thời điểm, ngân sách và kết quả của từng lần đưa SKU ra thị trường."
        actions={<Button label="+ Tạo chiến dịch" variant="primary" onClick={openCreate} />}
      />
      <section className="section-header">
        <div>
          <div className="eyebrow">Campaign registry</div>
          <h2>{campaigns.length.toLocaleString("vi-VN")} chiến dịch</h2>
        </div>
        <Text type="supporting" color="secondary">
          Dữ liệu từ Holo API
        </Text>
      </section>
      {error && <ErrorState message={error} onRetry={load} />}
      {loading ? (
        <LoadingState label="Đang tải chiến dịch" />
      ) : campaigns.length === 0 ? (
        <div className="surface surface__body">
          <Text type="large">Chưa có chiến dịch nào.</Text>
          <Text type="body" color="secondary" display="block">
            Tạo chiến dịch đầu tiên để gắn ngữ cảnh cho đề xuất KOC.
          </Text>
        </div>
      ) : (
        <>
          <div className="table-toolbar">
            <div className="table-toolbar__search">
              <TextInput
                label="Tìm chiến dịch"
                isLabelHidden
                value={search}
                onChange={setSearch}
                placeholder="Tên, mục tiêu hoặc mùa"
                hasClear
              />
            </div>
          </div>
          <section className="surface responsive-table">
            <div>
              <Table
                data={rows}
                columns={columns}
                idKey="campaignId"
                hasHover
                density="balanced"
                dividers="rows"
                textOverflow="truncate"
              />
            </div>
          </section>
        </>
      )}
      <Dialog isOpen={formOpen} onOpenChange={setFormOpen} width={620} purpose="form">
        <Layout
          header={
            <DialogHeader
              title={editing ? "Sửa chiến dịch" : "Tạo chiến dịch"}
              onOpenChange={setFormOpen}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <TextInput
                  label="Tên chiến dịch"
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                  isRequired
                />
                <TextInput
                  label="Mục tiêu"
                  value={form.objective}
                  onChange={(value) => setForm({ ...form, objective: value })}
                  isRequired
                />
                <div className="control-grid">
                  <TextInput
                    label="Ngày bắt đầu"
                    value={form.startDate}
                    onChange={(value) => setForm({ ...form, startDate: value })}
                  />
                  <TextInput
                    label="Ngày kết thúc"
                    value={form.endDate}
                    onChange={(value) => setForm({ ...form, endDate: value })}
                  />
                </div>
                <div className="control-grid--three control-grid">
                  <TextInput
                    label="Mùa"
                    value={form.season}
                    onChange={(value) => setForm({ ...form, season: value })}
                  />
                  <TextInput
                    label="Khuyến mãi"
                    description="0.15 = 15%"
                    value={String(form.promotionRate)}
                    onChange={(value) => setForm({ ...form, promotionRate: Number(value) || 0 })}
                  />
                  <TextInput
                    label="Ngân sách (VND)"
                    value={String(form.budget || "")}
                    onChange={(value) =>
                      setForm({ ...form, budget: Number(value.replace(/\D/g, "")) || 0 })
                    }
                  />
                </div>
                <Selector
                  label="Trạng thái"
                  options={statuses}
                  value={form.status}
                  onChange={(value) =>
                    setForm({ ...form, status: value as CampaignInput["status"] })
                  }
                />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Huỷ" variant="secondary" onClick={() => setFormOpen(false)} />
                <Button
                  label={editing ? "Lưu thay đổi" : "Tạo chiến dịch"}
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
        title="Xoá chiến dịch?"
        description={`Chiến dịch “${deleteTarget?.name ?? "này"}” và kết quả liên quan sẽ bị xoá.`}
        actionLabel="Xoá chiến dịch"
        isActionLoading={deleteLoading}
        onAction={remove}
      />
    </div>
  );
}
