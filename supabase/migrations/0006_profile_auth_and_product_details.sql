-- Account creation resilience and editable product profile fields.

alter table if exists public.products
  add column if not exists duration_estimate text,
  add column if not exists projection_estimate text,
  add column if not exists recommended_occasion text,
  add column if not exists recommended_season text;

create unique index if not exists profiles_email_unique_idx
on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    lower(coalesce(new.email, new.raw_user_meta_data->>'email', new.id::text || '@pending.decantscba.local')),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    nullif(coalesce(new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'phone_number', ''), '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
      phone = coalesce(excluded.phone, public.profiles.phone),
      updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
for insert to authenticated
with check (id = auth.uid());

revoke execute on function public.handle_new_user() from public, anon, authenticated;
