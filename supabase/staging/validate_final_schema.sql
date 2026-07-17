-- Fail the disposable staging validation if the final schema is incomplete.

do $$
declare
  required_table text;
  required_column text;
  required_function text;
begin
  foreach required_table in array array[
    'profiles',
    'user_roles',
    'brands',
    'fragrance_families',
    'perfume_brands',
    'categories',
    'products',
    'product_images',
    'decant_variants',
    'product_variants',
    'inventory_movements',
    'addresses',
    'carts',
    'cart_items',
    'shipping_methods',
    'coupons',
    'orders',
    'order_items',
    'payments',
    'shipments',
    'reviews',
    'checkout_reservation_guards',
    'checkout_coupon_reservations',
    'payment_webhook_events',
    'order_notification_outbox'
  ]
  loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'STAGING_SCHEMA_MISSING_TABLE: public.%', required_table;
    end if;
  end loop;

  foreach required_column in array array[
    'profiles.role',
    'products.category_id',
    'products.active',
    'products.featured',
    'orders.checkout_idempotency_key',
    'orders.shipping_method_id',
    'orders.coupon_id',
    'orders.reservation_expires_at',
    'orders.stock_released_at',
    'payments.provider_payment_id',
    'inventory_movements.order_id'
  ]
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = split_part(required_column, '.', 1)
        and column_name = split_part(required_column, '.', 2)
    ) then
      raise exception 'STAGING_SCHEMA_MISSING_COLUMN: public.%', required_column;
    end if;
  end loop;

  foreach required_function in array array[
    'public.next_order_number()',
    'public.is_admin()',
    'public.is_order_owner(uuid)',
    'public.reserve_checkout_stock_mirrored(jsonb)',
    'public.release_checkout_stock_mirrored(jsonb)',
    'public.release_order_stock_reservation(uuid,text,text)',
    'public.release_expired_checkout_reservations(integer)',
    'public.acquire_checkout_reservation_guard(uuid,text,timestamp with time zone,integer)',
    'public.reserve_checkout_coupon(uuid,uuid,text,timestamp with time zone)',
    'public.finalize_paid_order(uuid,text,text,text,text,jsonb)'
  ]
  loop
    if to_regprocedure(required_function) is null then
      raise exception 'STAGING_SCHEMA_MISSING_FUNCTION: %', required_function;
    end if;
  end loop;

  if exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname in (
        'profiles',
        'orders',
        'payments',
        'product_variants',
        'checkout_reservation_guards',
        'payment_webhook_events'
      )
      and not pg_class.relrowsecurity
  ) then
    raise exception 'STAGING_SCHEMA_RLS_DISABLED';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.finalize_paid_order(uuid,text,text,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'STAGING_SCHEMA_PRIVILEGE_LEAK: authenticated can finalize orders';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.finalize_paid_order(uuid,text,text,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'STAGING_SCHEMA_SERVICE_ROLE_MISSING_FINALIZER';
  end if;
end
$$;
