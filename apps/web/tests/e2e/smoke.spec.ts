import { expect, test } from "@playwright/test";

test("loads the Holo overview and navigates to recommendations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Holo" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nhìn rõ quyết định tiếp theo." })).toBeVisible();
  await page
    .getByRole("link", { name: /Đề xuất/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/recommendations$/);
  await expect(
    page.getByRole("heading", { name: "Ai là gương mặt hợp với SKU này?" }),
  ).toBeVisible();
});

test("shows the products workspace", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Sản phẩm có thể ra mắt." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Tạo SKU/ })).toBeVisible();
});
