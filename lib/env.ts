export type PaymentProvider = "mercadopago" | "stripe" | "manual" | "invalid";

export const env = {
  siteUrl: readSiteUrl(),
  supabaseUrl: optionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey:
    optionalEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: optionalEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optionalEnv("STRIPE_WEBHOOK_SECRET"),
  stripePublishableKey: optionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  mercadoPagoAccessToken: optionalEnv("MERCADOPAGO_ACCESS_TOKEN"),
  mercadoPagoPublicKey: optionalEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY"),
  mercadoPagoWebhookSecret: optionalEnv("MERCADOPAGO_WEBHOOK_SECRET"),
  paymentProvider: readPaymentProvider(),
  resendApiKey: optionalEnv("RESEND_API_KEY"),
  resendFromEmail: readEnv("RESEND_FROM_EMAIL", "pedidos@decantscba.com"),
  notificationWebhookSecret: optionalEnv("NOTIFICATION_WEBHOOK_SECRET"),
  cronSecret: optionalEnv("CRON_SECRET"),
  adminBootstrapEmails: (optionalEnv("ADMIN_BOOTSTRAP_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};

function optionalEnv(key: string) {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function readEnv(key: string, fallback: string) {
  return optionalEnv(key) ?? fallback;
}

function readSiteUrl() {
  const configuredUrl = optionalEnv("NEXT_PUBLIC_SITE_URL");
  if (configuredUrl) return configuredUrl.replace(/\/$/u, "");

  const vercelUrl = optionalEnv("VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//u, "").replace(/\/$/u, "")}`;
  }

  return "http://localhost:3000";
}

function readPaymentProvider(): PaymentProvider {
  const provider = readEnv("PAYMENT_PROVIDER", "mercadopago").toLowerCase();
  if (
    provider === "mercadopago" ||
    provider === "stripe" ||
    provider === "manual"
  )
    return provider;
  return "invalid";
}

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function hasSupabaseAdminConfig() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function getPaymentConfigurationError() {
  if (env.paymentProvider === "invalid")
    return "PAYMENT_PROVIDER no es vÃ¡lido.";
  if (env.paymentProvider === "manual" && process.env.NODE_ENV === "production")
    return "El pago manual no estÃ¡ permitido en producciÃ³n.";
  if (
    env.paymentProvider === "mercadopago" &&
    (!env.mercadoPagoAccessToken || !env.mercadoPagoWebhookSecret)
  ) {
    return "Mercado Pago no estÃ¡ configurado por completo.";
  }
  if (
    env.paymentProvider === "stripe" &&
    (!env.stripeSecretKey || !env.stripeWebhookSecret)
  ) {
    return "Stripe no estÃ¡ configurado por completo.";
  }
  if (
    process.env.NODE_ENV === "production" &&
    !env.siteUrl.startsWith("https://")
  )
    return "El sitio de producciÃ³n debe usar HTTPS.";
  return null;
}

export function getProductionConfigurationIssues() {
  const issues: string[] = [];
  if (!hasSupabaseConfig()) issues.push("supabase_public");
  if (!hasSupabaseAdminConfig()) issues.push("supabase_admin");
  if (getPaymentConfigurationError()) issues.push("payments");
  if (!env.notificationWebhookSecret) issues.push("notifications");
  if (!env.cronSecret) issues.push("cron");
  if (!env.resendApiKey) issues.push("email");
  return issues;
}
