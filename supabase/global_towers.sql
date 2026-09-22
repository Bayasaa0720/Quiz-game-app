-- "Үндсэн цамхаг" (global tower) функц: admin-ийн үүсгэсэн зарим ангиллыг
-- БҮХ хэрэглэгчид харагдаж, авирч болохоор нээлттэй болгоно (custom quiz
-- хэвээрээ хувийн, зөвхөн эзэмшигчид харагдана).
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

alter table public.categories
  add column if not exists is_global boolean not null default false;

-- categories: SELECT-ийг өөрийн ангилал + is_global ангилалд нээх,
-- харин INSERT/UPDATE/DELETE-г эзэмшигчид л зөвшөөрөх тул owner-only
-- "for all" policy-г 4 тусдаа policy болгож задална.
drop policy if exists "categories_owner_all" on public.categories;
drop policy if exists "categories_select" on public.categories;
drop policy if exists "categories_insert" on public.categories;
drop policy if exists "categories_update" on public.categories;
drop policy if exists "categories_delete" on public.categories;

create policy "categories_select" on public.categories
  for select
  using (auth.uid() = user_id or is_global = true);

create policy "categories_insert" on public.categories
  for insert
  with check (auth.uid() = user_id);

create policy "categories_update" on public.categories
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories_delete" on public.categories
  for delete
  using (auth.uid() = user_id);

-- SECURITY: "categories_update" дээрх owner шалгалт нь МӨР эзэмшдэг эсэхийг
-- л шалгадаг, is_global ГЭСЭН УТГЫГ биш — үүнийг ашиглаад хэрэглэгч өөрийн
-- ангиллаа admin-ын зөвшөөрөлгүйгээр шууд `update({is_global:true})`-ээр
-- нийтэд нээж чаддаг байсан (public_gallery.sql-ийн admin-approve урсгалыг
-- бүрэн алгасна). Trigger-ээр хаана: admin биш л бол is_global өөрчлөгдөхийг
-- цуцалж, хуучин утгыг нь буцаана.
drop trigger if exists trg_protect_categories_is_global on public.categories;
drop function if exists protect_categories_is_global();
create or replace function protect_categories_is_global()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_global is distinct from old.is_global
     and not exists (select 1 from app_admins where user_id = auth.uid()) then
    new.is_global := old.is_global;
  end if;
  return new;
end;
$$;

create trigger trg_protect_categories_is_global
  before update on public.categories
  for each row execute function protect_categories_is_global();

-- quiz_items: мөн адил SELECT-ийг global ангиллын асуултад нээнэ.
drop policy if exists "quiz_items_owner_all" on public.quiz_items;
drop policy if exists "quiz_items_select" on public.quiz_items;
drop policy if exists "quiz_items_insert" on public.quiz_items;
drop policy if exists "quiz_items_update" on public.quiz_items;
drop policy if exists "quiz_items_delete" on public.quiz_items;

create policy "quiz_items_select" on public.quiz_items
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.categories c
      where c.id = quiz_items.category_id and c.is_global = true
    )
  );

create policy "quiz_items_insert" on public.quiz_items
  for insert
  with check (auth.uid() = user_id);

create policy "quiz_items_update" on public.quiz_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quiz_items_delete" on public.quiz_items
  for delete
  using (auth.uid() = user_id);

-- tower_floors: global ангиллын давхруудыг бусад хэрэглэгчид ч уншиж чадах болгоно.
drop policy if exists "tower_floors_owner_select" on tower_floors;
create policy "tower_floors_owner_select" on tower_floors
  for select using (
    exists (
      select 1 from public.categories c
      where c.id = tower_floors.category_id
        and (c.user_id = auth.uid() or c.is_global = true)
    )
  );

-- Сая нэмсэн 3 CS2 ангиллыг үндсэн (global) цамхаг болгох.
update public.categories
  set is_global = true
  where name in ('cs2 teams', 'cs2 players', 'cs2 map knowledge')
    and user_id = '6c31c337-08ad-4694-aa7b-33d31ca50b88';
