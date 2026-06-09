-- Security advisor fixes after production hardening.

alter function public.touch_updated_at() set search_path = public;
alter function public.next_order_number() set search_path = public;

alter function public.has_role(public.app_role) security invoker;
alter function public.is_staff() security invoker;
alter function public.is_admin() security invoker;
alter function public.is_order_owner(uuid) security invoker;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.confirm_paid_order(uuid) from public, anon, authenticated;
revoke execute on function public.confirm_paid_order(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.increment_variant_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function public.increment_decant_variant_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function public.reserve_checkout_stock(jsonb) from public, anon, authenticated;

grant execute on function public.increment_variant_stock(uuid, integer) to service_role;
grant execute on function public.increment_decant_variant_stock(uuid, integer) to service_role;
grant execute on function public.reserve_checkout_stock(jsonb) to service_role;

drop policy if exists "product images bucket public read" on storage.objects;
drop policy if exists "product_images_storage_public_read" on storage.objects;
