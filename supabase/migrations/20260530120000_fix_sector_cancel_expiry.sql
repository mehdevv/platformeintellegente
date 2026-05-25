-- Sector cancel: set expiry in the past so client and has_report_entitlement agree immediately
-- (expires_at = now() can still look active when client clock lags the server).

create or replace function public.cancel_my_sector_access(p_entitlement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_entitlement_id is null then
    raise exception 'Entitlement id required';
  end if;
  update public.user_report_entitlements
  set
    expires_at = now() - interval '1 second',
    notes = trim(both from coalesce(notes, '') || ' · Canceled by account holder ' || to_char(now(), 'YYYY-MM-DD'))
  where id = p_entitlement_id
    and user_id = uid
    and sector_id is not null
    and (expires_at is null or expires_at > now());
  if not found then
    raise exception 'Active sector subscription not found';
  end if;
end;
$$;
