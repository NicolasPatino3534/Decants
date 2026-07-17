param(
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path ([IO.Path]::GetTempPath()) (
    "decants-staging-validation-" + [guid]::NewGuid().ToString("N")
  )
}

if (Test-Path -LiteralPath $OutputDirectory) {
  throw "El directorio de salida ya existe: $OutputDirectory"
}

$supabaseDirectory = Join-Path $OutputDirectory "supabase"
$migrationDirectory = Join-Path $supabaseDirectory "migrations"
New-Item -ItemType Directory -Path $migrationDirectory | Out-Null
Copy-Item -LiteralPath (Join-Path $repositoryRoot "supabase\config.toml") -Destination $supabaseDirectory

$migrationPlan = @(
  @{
    Source = "supabase\migrations\0001_init.sql"
    Target = "20260714000100_0001_init.sql"
  },
  @{
    Source = "supabase\migrations\0002_production_hardening.sql"
    Target = "20260714000200_0002_production_hardening.sql"
  },
  @{
    Source = "supabase\staging\historical_storefront_baseline_after_0002.sql"
    Target = "20260714000250_historical_storefront_baseline.sql"
  },
  @{
    Source = "supabase\migrations\0003_security_advisor_fixes.sql"
    Target = "20260714000300_0003_security_advisor_fixes.sql"
  },
  @{
    Source = "supabase\migrations\0004_catalog_schema_compatibility.sql"
    Target = "20260714000400_0004_catalog_schema_compatibility.sql"
  },
  @{
    Source = "supabase\migrations\0005_storefront_flow_hardening.sql"
    Target = "20260714000500_0005_storefront_flow_hardening.sql"
  },
  @{
    Source = "supabase\migrations\0006_profile_auth_and_product_details.sql"
    Target = "20260714000600_0006_profile_auth_and_product_details.sql"
  },
  @{
    Source = "supabase\migrations\20260712214511_align_order_items_product_variants.sql"
    Target = "20260714000700_align_order_items_product_variants.sql"
  },
  @{
    Source = "supabase\migrations\20260712223000_prevent_profile_role_escalation.sql"
    Target = "20260714000800_prevent_profile_role_escalation.sql"
  },
  @{
    Source = "supabase\migrations\20260712224500_checkout_reservation_expiry.sql"
    Target = "20260714000900_checkout_reservation_expiry.sql"
  },
  @{
    Source = "supabase\migrations\20260712230000_schema_security_consistency.sql"
    Target = "20260714001000_schema_security_consistency.sql"
  },
  @{
    Source = "supabase\migrations\20260712231500_transactional_stock_release.sql"
    Target = "20260714001100_transactional_stock_release.sql"
  },
  @{
    Source = "supabase\migrations\20260713220000_atomic_checkout_and_payment_finalization.sql"
    Target = "20260714001200_atomic_checkout_and_payment_finalization.sql"
  },
  @{
    Source = "supabase\staging\validate_final_schema.sql"
    Target = "20260714001300_validate_final_schema.sql"
  },
  @{
    Source = "supabase\migrations\20260716165809_validate_variant_integrity_and_profile_guard.sql"
    Target = "20260714001400_validate_variant_integrity_and_profile_guard.sql"
  }
)

foreach ($migration in $migrationPlan) {
  $source = Join-Path $repositoryRoot $migration.Source
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Falta el archivo requerido: $($migration.Source)"
  }
  Copy-Item -LiteralPath $source -Destination (Join-Path $migrationDirectory $migration.Target)
}

$manifest = $migrationPlan | ForEach-Object { $_.Target }
$manifest | Set-Content -LiteralPath (Join-Path $OutputDirectory "migration-order.txt") -Encoding utf8

Write-Output (Resolve-Path -LiteralPath $OutputDirectory).Path
