import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Selector } from "@astryxdesign/core/Selector";
import type { TableColumn } from "@astryxdesign/core/Table";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Product, ProductInput } from "@holo/api-client";
import { useEffect, useState } from "react";
import { holoApi } from "../../lib/api";
import { ErrorState, formatMoney, getErrorMessage, LoadingState, PageHeader, TagList } from "../ui";

interface ProductRow extends Record<string, unknown> {
  skuId: string;
  name: string;
  category: Product["category"];
  brand: string;
  sellingPrice: number;
  stock: number;
  styleTags: readonly string[];
}

const categories = ["dress", "top", "bottom", "outerwear", "accessory", "footwear"];
const emptyForm: ProductInput = {
  name: "",
  description: "",
  category: "dress",
  brand: "",
  sellingPrice: 0,
  stock: 0,
  styleTags: [],
  targetAudience: [],
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    holoApi
      .listProducts(50, (page - 1) * 50)
      .then((result) => {
        setProducts(result.items);
        setTotal(result.meta.total);
      })
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page]);

  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.skuId} ${product.brand}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };
  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      styleTags: [...product.styleTags],
      targetAudience: [...product.targetAudience],
    });
    setFormOpen(true);
  };
  const save = async () => {
    if (
      !form.name.trim() ||
      !form.brand.trim() ||
      form.sellingPrice <= 0 ||
      form.styleTags.length === 0 ||
      form.targetAudience.length === 0
    )
      return;
    setSaving(true);
    try {
      if (editing) await holoApi.updateProduct(editing.skuId, form);
      else await holoApi.createProduct(form);
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
      await holoApi.deleteProduct(deleteTarget.skuId);
      setDeleteTarget(null);
      load();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setDeleteLoading(false);
    }
  };

  const rows: ProductRow[] = visibleProducts.map((product) => ({
    ...product,
    styleTags: product.styleTags,
  }));
  const columns: TableColumn<ProductRow>[] = [
    {
      key: "name",
      header: "SKU",
      width: proportional(2),
      renderCell: (row) => (
        <div>
          <strong>{row.name}</strong>
          <span className="table-subtext mono">{row.skuId}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Danh mục",
      width: proportional(1),
      renderCell: (row) => <span className="tag">{row.category}</span>,
    },
    { key: "brand", header: "Thương hiệu", width: proportional(1) },
    {
      key: "sellingPrice",
      header: "Giá bán",
      width: pixel(120),
      align: "end",
      renderCell: (row) => formatMoney(row.sellingPrice),
    },
    {
      key: "stock",
      header: "Tồn kho",
      width: pixel(90),
      align: "end",
      renderCell: (row) => <span className={row.stock < 20 ? "low-stock" : ""}>{row.stock}</span>,
    },
    {
      key: "styleTags",
      header: "Phong cách",
      width: proportional(1.4),
      renderCell: (row) => <TagList items={row.styleTags} />,
    },
    {
      key: "actions",
      header: "",
      width: pixel(132),
      renderCell: (row) => (
        <HStack gap={1} hAlign="end">
          <Button
            label="Sửa"
            variant="ghost"
            size="sm"
            onClick={() => {
              const item = products.find((candidate) => candidate.skuId === row.skuId);
              if (item) openEdit(item);
            }}
          />
          <Button
            label="Xoá"
            variant="ghost"
            size="sm"
            onClick={() =>
              setDeleteTarget(products.find((item) => item.skuId === row.skuId) ?? null)
            }
          />
        </HStack>
      ),
    },
  ];

  return (
    <div className="holo-page holo-page--tight">
      <PageHeader
        eyebrow="Catalog / SKU"
        title="Sản phẩm có thể ra mắt."
        description="Quản lý từng SKU như một tín hiệu quyết định: giá bán, tồn kho, phong cách và tệp khách hàng mục tiêu."
        actions={<Button label="+ Tạo SKU" variant="primary" onClick={openCreate} />}
      />
      <section className="section-header">
        <div>
          <div className="eyebrow">Danh mục sản phẩm</div>
          <h2>{total.toLocaleString("vi-VN")} SKU</h2>
        </div>
        <Text type="supporting" color="secondary">
          Trang {page}
        </Text>
      </section>
      {error && <ErrorState message={error} onRetry={load} />}
      {loading ? (
        <LoadingState label="Đang tải danh mục SKU" />
      ) : products.length === 0 ? (
        <div className="surface surface__body">
          <Text type="large">Chưa có SKU nào.</Text>
          <Text type="body" color="secondary" display="block">
            Tạo SKU đầu tiên để bắt đầu workspace đề xuất.
          </Text>
        </div>
      ) : (
        <>
          <div className="table-toolbar">
            <div className="table-toolbar__search">
              <TextInput
                label="Tìm SKU"
                isLabelHidden
                value={search}
                onChange={setSearch}
                placeholder="Tên, mã SKU hoặc thương hiệu"
                hasClear
              />
            </div>
            <Text type="supporting" color="secondary">
              Tìm trong trang hiện tại
            </Text>
          </div>
          <section className="surface responsive-table">
            <div>
              <Table
                data={rows}
                columns={columns}
                idKey="skuId"
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
                label="Phân trang SKU"
              />{" "}
            </div>
          )}
        </>
      )}
      <Dialog isOpen={formOpen} onOpenChange={setFormOpen} width={620} purpose="form">
        <Layout
          header={
            <DialogHeader title={editing ? "Sửa SKU" : "Tạo SKU mới"} onOpenChange={setFormOpen} />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <div className="control-grid">
                  <TextInput
                    label="Tên SKU"
                    value={form.name}
                    onChange={(value) => setForm({ ...form, name: value })}
                    isRequired
                  />
                  <TextInput
                    label="Thương hiệu"
                    value={form.brand}
                    onChange={(value) => setForm({ ...form, brand: value })}
                    isRequired
                  />
                </div>
                <TextInput
                  label="Mô tả"
                  value={form.description}
                  onChange={(value) => setForm({ ...form, description: value })}
                />
                <div className="control-grid">
                  <Selector
                    label="Danh mục"
                    options={categories}
                    value={form.category}
                    onChange={(value) =>
                      setForm({ ...form, category: value as ProductInput["category"] })
                    }
                  />
                  <TextInput
                    label="Giá bán (VND)"
                    type="text"
                    value={String(form.sellingPrice || "")}
                    onChange={(value) =>
                      setForm({ ...form, sellingPrice: Number(value.replace(/\D/g, "")) || 0 })
                    }
                    isRequired
                  />
                </div>
                <div className="control-grid">
                  <TextInput
                    label="Tồn kho"
                    value={String(form.stock)}
                    onChange={(value) =>
                      setForm({ ...form, stock: Number(value.replace(/\D/g, "")) || 0 })
                    }
                  />
                  <TextInput
                    label="Nhãn phong cách"
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
                <TextInput
                  label="Tệp khách hàng mục tiêu"
                  description="Phân tách bằng dấu phẩy"
                  value={form.targetAudience.join(", ")}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      targetAudience: value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  isRequired
                />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Huỷ" variant="secondary" onClick={() => setFormOpen(false)} />
                <Button
                  label={editing ? "Lưu thay đổi" : "Tạo SKU"}
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
        title="Xoá SKU?"
        description={`SKU “${deleteTarget?.name ?? "này"}” sẽ bị xoá khỏi danh mục. Thao tác này không thể hoàn tác.`}
        actionLabel="Xoá SKU"
        isActionLoading={deleteLoading}
        onAction={remove}
      />
    </div>
  );
}
