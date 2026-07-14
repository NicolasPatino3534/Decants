alter table public.orders
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists stock_released_at timestamptz;

create index if not exists orders_expired_reservations_idx
on public.orders (reservation_expires_at)
where stock_released_at is null
  and payment_status in ('pending', 'payment_review');

create or replace function public.release_expired_checkout_reservations(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order record;
  target_item record;
  released_count integer := 0;
begin
  for target_order in
    select id
    from public.orders
    where reservation_expires_at < now()
      and stock_released_at is null
      and payment_status = 'pending'
      and status <> 'cancelled'
    order by reservation_expires_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  loop
    update public.orders
    set status = 'cancelled',
        payment_status = 'failed',
        stock_released_at = now(),
        updated_at = now()
    where id = target_order.id
      and stock_released_at is null;

    if found then
      for target_item in
        select variant_id, quantity from public.order_items where order_id = target_order.id and variant_id is not null
      loop
        update public.product_variants set stock = stock + target_item.quantity, updated_at = now() where id = target_item.variant_id;
        update public.decant_variants set stock_on_hand = stock_on_hand + target_item.quantity, updated_at = now() where id = target_item.variant_id;
      end loop;

      update public.payments set status = 'failed', updated_at = now() where order_id = target_order.id and status <> 'paid';
      released_count := released_count + 1;
    end if;
  end loop;

  return released_count;
end;
$$;

revoke all on function public.release_expired_checkout_reservations(integer) from public, anon, authenticated;
grant execute on function public.release_expired_checkout_reservations(integer) to service_role;
