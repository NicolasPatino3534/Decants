import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const enabled = process.env.REMOTE_AUTH_VALIDATION === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("real Preview Auth against staging", () => {
  test.skip(
    !enabled || !supabaseUrl || !serviceRoleKey,
    "Real Preview Auth requires explicit staging credentials and opt-in.",
  );
  test.describe.configure({ mode: "serial" });

  const email = `preview-auth-${randomUUID()}@example.invalid`;
  const password = `Qa-${randomBytes(18).toString("base64url")}!9`;
  let userId: string | undefined;

  const admin =
    supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        })
      : null;

  test.beforeAll(async () => {
    if (!admin) return;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Preview Auth QA" },
    });
    expect(created.error).toBeNull();
    userId = created.data.user?.id;
    expect(userId).toBeTruthy();
  });

  test.afterAll(async () => {
    if (!admin || !userId) return;
    const deleted = await admin.auth.admin.deleteUser(userId);
    expect(deleted.error).toBeNull();
  });

  test("logs in through Preview and denies customer access to admin", async ({
    page,
  }) => {
    await page.goto("/auth?next=/cuenta");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/Contrase/i, { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Ingresar", exact: true })
      .last()
      .click();

    await expect(page).toHaveURL(/\/cuenta$/u);
    await expect(
      page.getByRole("heading", { name: /Mis pedidos/i }),
    ).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/auth" && url.searchParams.get("next") === "/admin",
    );
  });
});
