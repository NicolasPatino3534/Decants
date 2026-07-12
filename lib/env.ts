export const env = {
  siteUrl: readEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  supabaseUrl: optionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey:
    optionalEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: optionalEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optionalEnv("STRIPE_WEBHOOK_SECRET"),
  stripePublishableKey: optionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  mercadoPagoAccessToken: optionalEnv("MERCADOPAGO_ACCESS_TOKEN"),
  mercadoPagoPublicKey: optionalEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY"),
  mercadoPagoWebhookSecret: optionalEnv("MERCADOPAGO_WEBHOOK_SECRET"),
  paymentProvider: readEnv("PAYMENT_PROVIDER", "mercadopago"),
  resendApiKey: optionalEnv("RESEND_API_KEY"),
  resendFromEmail: readEnv("RESEND_FROM_EMAIL", "pedidos@decantscba.com"),
  notificationWebhookSecret: optionalEnv("NOTIFICATION_WEBHOOK_SECRET"),
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

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function hasSupabaseAdminConfig() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}
