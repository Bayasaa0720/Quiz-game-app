-- Public tower gallery: category эзэмшигч "нийтэд нээх" хүсэлт гаргаж,
-- admin зөвшөөрсний дараа is_global = true болж, бүх хэрэглэгчид харагдана.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

alter table categories add column if not exists is_public_requested boolean not null default false;
alter table categories add column if not exists is_public_requested_at timestamptz;

-- Хүлээгдэж буй хүсэлтүүдийг зөвхөн admin харна.
create or replace function admin_list_public_requests()
returns table (
  category_id uuid,
  category_name text,
  owner_email text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then
    raise exception 'Зөвхөн admin эрхтэй';
  end if;

  return query
    select c.id, c.name, u.email::text, c.is_public_requested_at
    from categories c
    join auth.users u on u.id = c.user_id
    where c.is_public_requested = true and c.is_global = false
    order by c.is_public_requested_at asc nulls last;
end;
$$;

grant execute on function admin_list_public_requests() to authenticated;

-- Зөвшөөрөх: is_global = true болгож, хүсэлтийг арилгана.
create or replace function admin_approve_public_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then
    raise exception 'Зөвхөн admin эрхтэй';
  end if;

  update categories
  set is_global = true, is_public_requested = false
  where id = p_category_id;
end;
$$;

grant execute on function admin_approve_public_category(uuid) to authenticated;

-- Татгалзах: зөвхөн хүсэлтийг арилгана, is_global өөрчлөгдөхгүй.
create or replace function admin_reject_public_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then
    raise exception 'Зөвхөн admin эрхтэй';
  end if;

  update categories
  set is_public_requested = false
  where id = p_category_id;
end;
$$;

grant execute on function admin_reject_public_category(uuid) to authenticated;
