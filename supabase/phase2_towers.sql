-- Phase 2: Tower/Floor materialization систем
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

-- 1. app_admins — системийн админ жагсаалт
create table if not exists app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table app_admins enable row level security;
-- Шууд SELECT/INSERT-г хэрэглэгчдэд нээхгүй; зөвхөн security-definer функцээс шалгагдана.

-- Өөрийн акаунтыг эхний admin болгож нэмэх (шаардлагатай бол user_id-г солино):
insert into app_admins (user_id)
values ('6c31c337-08ad-4694-aa7b-33d31ca50b88')
on conflict (user_id) do nothing;

-- 2. quiz_items-д difficulty нэмэх
alter table public.quiz_items
  add column if not exists difficulty text not null default 'normal'
  check (difficulty in ('easy', 'normal', 'hard'));

-- 3. tower_floors — materialized давхрууд
create table if not exists tower_floors (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  floor_index integer not null,
  difficulty text not null check (difficulty in ('easy','normal','hard')),
  question_ids uuid[] not null,
  enemy_hp integer not null,
  generated_at timestamptz not null default now(),
  unique (category_id, floor_index)
);
alter table tower_floors enable row level security;

drop policy if exists "tower_floors_owner_select" on tower_floors;
create policy "tower_floors_owner_select" on tower_floors
  for select using (
    exists (select 1 from categories c where c.id = tower_floors.category_id and c.user_id = auth.uid())
  );

drop policy if exists "tower_floors_no_direct_write" on tower_floors;
create policy "tower_floors_no_direct_write" on tower_floors
  for all to authenticated using (false) with check (false);

-- 4. regenerate_tower_floors() — admin-only materialize функц
create or replace function regenerate_tower_floors(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_caller_admin boolean;
  lvl text;
  q record;
  batch uuid[];
  fidx integer := 0;
begin
  select exists(select 1 from app_admins where user_id = auth.uid())
    into is_caller_admin;

  if not is_caller_admin then
    raise exception 'Зөвхөн admin давхар materialize хийх эрхтэй';
  end if;

  delete from tower_floors where category_id = p_category_id;

  foreach lvl in array array['easy', 'normal', 'hard']
  loop
    batch := array[]::uuid[];

    for q in
      select id from quiz_items
      where category_id = p_category_id and difficulty = lvl
      order by id
    loop
      batch := batch || q.id;
      if array_length(batch, 1) = 10 then
        insert into tower_floors (category_id, floor_index, difficulty, question_ids, enemy_hp)
        values (p_category_id, fidx, lvl, batch, array_length(batch, 1) * 10);
        fidx := fidx + 1;
        batch := array[]::uuid[];
      end if;
    end loop;

    if array_length(batch, 1) > 0 then
      insert into tower_floors (category_id, floor_index, difficulty, question_ids, enemy_hp)
      values (p_category_id, fidx, lvl, batch, array_length(batch, 1) * 10);
      fidx := fidx + 1;
    end if;
  end loop;

  -- Regenerate хийгдэхэд тухайн категорийн бүх хэрэглэгчийн прогресс дахин эхэлнэ (BRD 10-р хэсэг)
  update tower_progress set highest_cleared_floor = -1, updated_at = now()
  where category_id = p_category_id;
end;
$$;

-- 5. tower_progress — тоглогчийн давхрын прогресс
create table if not exists tower_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  highest_cleared_floor integer not null default -1,
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);
alter table tower_progress enable row level security;

drop policy if exists "tower_progress_owner_all" on tower_progress;
create policy "tower_progress_owner_all" on tower_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
