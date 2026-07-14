create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT'
     and new.role::text <> 'customer'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'profile role cannot be assigned by the profile owner';
  end if;

  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'profile role cannot be changed by the profile owner';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    execute 'create trigger prevent_profile_role_escalation
      before insert or update on public.profiles
      for each row execute function public.prevent_profile_role_escalation()';
  end if;
end $$;

revoke all on function public.prevent_profile_role_escalation() from public, anon, authenticated;
grant execute on function public.prevent_profile_role_escalation() to service_role;
