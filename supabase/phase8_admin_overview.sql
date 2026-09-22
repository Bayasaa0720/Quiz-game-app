-- Phase 8: Admin overview — бүх хэрэглэгчийн цамхгуудыг нэг дэлгэцээс харах.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.
-- categories/quiz_items/tower_floors RLS нь owner-only тул admin эдгээрийг
-- шууд select хийж чадахгүй. Иймд security-definer функцээр дамжуулж,
-- зөвхөн app_admins-д бүртгэлтэй хэрэглэгчид бүх өгөгдлийг нэгтгэж харуулна.

drop function if exists admin_list_towers();
create or replace function admin_list_towers()
returns table (
  category_id uuid,
  category_name text,
  owner_email text,
  question_count bigint,
  floor_count bigint,
  last_generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then
    raise exception 'Зөвхөн admin эрхтэй хэрэглэгч харах боломжтой';
  end if;

  return query
    select
      c.id,
      c.name,
      u.email::text,
      (select count(*) from quiz_items q where q.category_id = c.id),
      (select count(*) from tower_floors f where f.category_id = c.id),
      (select max(f.generated_at) from tower_floors f where f.category_id = c.id)
    from categories c
    join auth.users u on u.id = c.user_id
    order by c.name;
end;
$$;

grant execute on function admin_list_towers() to authenticated;
