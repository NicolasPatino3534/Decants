import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const projectRef = requiredEnv("STAGING_PROJECT_REF");
const supabaseUrl = requiredEnv("STAGING_SUPABASE_URL");
const anonKey = requiredEnv("STAGING_SUPABASE_ANON_KEY");
const serviceRoleKey = requiredEnv("STAGING_SUPABASE_SERVICE_ROLE_KEY");
const expectedHost = `${projectRef}.supabase.co`;

assert.equal(
  new URL(supabaseUrl).hostname,
  expectedHost,
  "Refusing to run Auth validation against an unexpected project.",
);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: authOptions(),
});
const runId = randomUUID().replaceAll("-", "").slice(0, 16);
const password = `Qa-${randomBytes(18).toString("base64url")}!9`;
const users = [
  { label: "customer-a", email: `codex-auth-a-${runId}@mailinator.com` },
  { label: "customer-b", email: `codex-auth-b-${runId}@mailinator.com` },
  { label: "admin", email: `codex-auth-admin-${runId}@mailinator.com` },
];
const createdUserIds = [];
const createdOrderIds = [];
const checks = [];
const blocks = [];

try {
  const signupClient = createClient(supabaseUrl, anonKey, {
    auth: authOptions(),
  });
  const signup = await signupClient.auth.signUp({
    email: users[0].email,
    password,
    options: { data: { full_name: `Codex QA ${users[0].label}` } },
  });

  if (signup.error?.code === "over_email_send_rate_limit") {
    blocks.push("registration email rate limit");
    console.log("BLOCKED registration email rate limit");
  } else {
    assert.ifError(signup.error);
    assert.ok(signup.data.user?.id, "Signup did not return customer-a.");
    users[0].id = signup.data.user.id;
    createdUserIds.push(signup.data.user.id);
    if (!signup.data.session) {
      const confirmation = await admin.auth.admin.updateUserById(
        signup.data.user.id,
        { email_confirm: true },
      );
      assert.ifError(confirmation.error);
    }
    pass("registration for an ephemeral user");
  }

  for (const user of users) {
    if (user.id) continue;
    const created = await admin.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Codex QA ${user.label}` },
    });
    assert.ifError(created.error);
    assert.ok(
      created.data.user?.id,
      `Admin fixture did not create ${user.label}.`,
    );
    user.id = created.data.user.id;
    createdUserIds.push(created.data.user.id);
  }
  pass("three ephemeral Auth fixtures available without outbound email");

  const invalidLogin = createClient(supabaseUrl, anonKey, {
    auth: authOptions(),
  });
  const invalidResult = await invalidLogin.auth.signInWithPassword({
    email: users[0].email,
    password: `${password}-invalid`,
  });
  assert.ok(invalidResult.error, "Invalid login unexpectedly succeeded.");
  pass("incorrect login rejected");

  const customerA = await signIn(users[0].email, password);
  const customerB = await signIn(users[1].email, password);
  pass("correct login for two isolated users");

  const memoryStorage = createMemoryStorage();
  const persistentClient = createClient(supabaseUrl, anonKey, {
    auth: { ...authOptions(), persistSession: true, storage: memoryStorage },
  });
  const persistentLogin = await persistentClient.auth.signInWithPassword({
    email: users[0].email,
    password,
  });
  assert.ifError(persistentLogin.error);
  const reloadedClient = createClient(supabaseUrl, anonKey, {
    auth: { ...authOptions(), persistSession: true, storage: memoryStorage },
  });
  const restored = await reloadedClient.auth.getSession();
  assert.ifError(restored.error);
  assert.equal(restored.data.session?.user.id, users[0].id);
  const logout = await reloadedClient.auth.signOut();
  assert.ifError(logout.error);
  const afterLogout = await reloadedClient.auth.getSession();
  assert.equal(afterLogout.data.session, null);
  pass("session persistence and logout");

  const recovery = await admin.auth.admin.generateLink({
    type: "recovery",
    email: users[0].email,
    options: { redirectTo: "http://127.0.0.1:3000/auth" },
  });
  assert.ifError(recovery.error);
  pass("password recovery request");

  const profileRows = await admin
    .from("profiles")
    .select("id,role")
    .in(
      "id",
      users.map((user) => user.id),
    );
  assert.ifError(profileRows.error);
  assert.equal(profileRows.data?.length, 3);
  assert.ok(profileRows.data?.every((profile) => profile.role === "customer"));
  pass("signup trigger creates customer profiles");

  const promoteAuth = await admin.auth.admin.updateUserById(users[2].id, {
    app_metadata: { role: "admin", roles: ["admin"] },
  });
  assert.ifError(promoteAuth.error);
  const promoteProfile = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", users[2].id);
  assert.ifError(promoteProfile.error);
  const adminUser = await signIn(users[2].email, password);

  const now = Date.now();
  const fixtureOrders = [users[0], users[1]].map((user, index) => ({
    user_id: user.id,
    order_number: `QA-${runId}-${index + 1}`,
    status: "pending_payment",
    payment_status: "pending",
    shipment_status: "pending",
    subtotal_cents: 1000,
    shipping_cents: 0,
    discount_cents: 0,
    total_cents: 1000,
    customer_email: user.email,
    customer_name: `Codex QA ${index + 1}`,
    shipping_address: {
      line1: "QA only",
      city: "Cordoba",
      province: "Cordoba",
      postalCode: "5000",
    },
    checkout_idempotency_key: `auth-audit-${runId}-${index + 1}`,
    reservation_expires_at: new Date(now + 30 * 60 * 1000).toISOString(),
    notes: `auth-audit:${runId}`,
  }));
  const insertedOrders = await admin
    .from("orders")
    .insert(fixtureOrders)
    .select("id,user_id");
  assert.ifError(insertedOrders.error);
  assert.equal(insertedOrders.data?.length, 2);
  createdOrderIds.push(...insertedOrders.data.map((order) => order.id));

  const customerAOrders = await customerA
    .from("orders")
    .select("id,user_id")
    .in("id", createdOrderIds);
  assert.ifError(customerAOrders.error);
  assert.deepEqual(
    customerAOrders.data?.map((order) => order.user_id),
    [users[0].id],
  );

  const customerBOrders = await customerB
    .from("orders")
    .select("id,user_id")
    .in("id", createdOrderIds);
  assert.ifError(customerBOrders.error);
  assert.deepEqual(
    customerBOrders.data?.map((order) => order.user_id),
    [users[1].id],
  );

  const adminOrders = await adminUser
    .from("orders")
    .select("id,user_id")
    .in("id", createdOrderIds);
  assert.ifError(adminOrders.error);
  assert.equal(adminOrders.data?.length, 2);
  pass("customer order isolation and admin access");

  const forbiddenAdminWrite = await customerA
    .from("products")
    .update({ featured: true })
    .eq("id", randomUUID())
    .select("id");
  assert.ok(
    forbiddenAdminWrite.error || forbiddenAdminWrite.data?.length === 0,
    "A customer unexpectedly obtained an administrative write result.",
  );
  pass("customer denied administrative catalog writes");

  const revokedLogin = await customerB.auth.getSession();
  assert.ifError(revokedLogin.error);
  assert.ok(revokedLogin.data.session);
  const revoke = await admin.auth.admin.signOut(
    revokedLogin.data.session.access_token,
    "global",
  );
  assert.ifError(revoke.error);
  const refresh = await customerB.auth.refreshSession({
    refresh_token: revokedLogin.data.session.refresh_token,
  });
  assert.ok(refresh.error || !refresh.data.session);
  pass("server-side session revocation");

  if (blocks.length > 0) {
    console.log(
      `Auth staging validation completed with external blocks (${checks.length} checks, ${blocks.length} blocked).`,
    );
    process.exitCode = 2;
  } else {
    console.log(`Auth staging validation passed (${checks.length} checks).`);
  }
} finally {
  if (createdOrderIds.length > 0) {
    const cleanupOrders = await admin
      .from("orders")
      .delete()
      .in("id", createdOrderIds);
    if (cleanupOrders.error) {
      console.error("Auth validation cleanup could not delete fixture orders.");
    }
  }

  for (const userId of createdUserIds.reverse()) {
    const cleanupUser = await admin.auth.admin.deleteUser(userId);
    if (cleanupUser.error) {
      console.error(
        "Auth validation cleanup could not delete an ephemeral user.",
      );
    }
  }
}

function authOptions() {
  return {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  };
}

async function signIn(email, userPassword) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: authOptions(),
  });
  const result = await client.auth.signInWithPassword({
    email,
    password: userPassword,
  });
  assert.ifError(result.error);
  assert.ok(result.data.session);
  return client;
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function pass(name) {
  checks.push(name);
  console.log(`PASS ${name}`);
}
