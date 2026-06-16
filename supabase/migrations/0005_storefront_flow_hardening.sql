-- Align production permissions and commerce states with the real DecantsCBA flow.

alter type public.order_status add value if not exists 'pending_payment';
alter type public.order_status add value if not exists 'payment_review';
alter type public.order_status add value if not exists 'ready_to_ship';
alter type public.order_status add value if not exists 'rejected';

alter type public.payment_status add value if not exists 'payment_review';
alter type public.payment_status add value if not exists 'rejected';
alter type public.payment_status add value if not exists 'cancelled';

alter type public.shipment_status add value if not exists 'ready_to_ship';
alter type public.shipment_status add value if not exists 'shipped';

create or replace function public.has_admin_role()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'role') in ('owner', 'admin', 'staff')
    or (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' -> 'roles') ?| array['owner', 'admin', 'staff'],
    false
  );
$$;

revoke all on function public.has_admin_role() from public;
grant execute on function public.has_admin_role() to authenticated;
