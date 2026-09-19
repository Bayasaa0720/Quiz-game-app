-- Багш/Сурагчийн классын систем (v5 BRD Feature 07).
-- Эрхийн загвар: зөвхөн 2 төрөл — 'teacher' ба 'student'. "Эцэг эх" гэсэн тусдаа
-- эрх байхгүй. Role нь бүртгүүлэх үед (auth signUp-ийн user_metadata-аар дамжиж)
-- сонгогдож, дараа нь солигдохгүй (доорх user_profiles-д UPDATE policy алга).
--
-- ЭНЭ ФАЙЛ ЦААШИД ГАНЦ ЭХ СУРВАЛЖ (single source of truth). Логик
-- өөрчлөгдөх бүрт шинэ patch файл үүсгэхийн оронд ЭНД ШУУД edit хийж,
-- дараа нь Supabase SQL Editor-т ЭНЭ ФАЙЛЫГ БҮХЭЛД НЬ дахин ажиллуулна —
-- policy болон функц бүр өөрийн CREATE-ийн өмнө DROP IF EXISTS хийдэг тул
-- дахин ажиллуулахад үргэлж аюулгүй.
--
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

-- 1) Хэрэглэгчийн role
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

drop policy if exists "user_profiles_owner_select" on user_profiles;
create policy "user_profiles_owner_select" on user_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "user_profiles_owner_insert" on user_profiles;
create policy "user_profiles_owner_insert" on user_profiles
  for insert with check (auth.uid() = user_id);
-- Санаатайгаар UPDATE policy алга — role нь анхны сонголтоороо тогтмол үлдэнэ.

-- 2) Анги (classroom) — зөвхөн багш үүсгэнэ
create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

alter table classrooms enable row level security;

drop policy if exists "classrooms_teacher_all" on classrooms;
create policy "classrooms_teacher_all" on classrooms
  for all using (auth.uid() = teacher_user_id) with check (auth.uid() = teacher_user_id);
-- Санаатайгаар сурагчид зориулсан "classrooms" SELECT policy алга — сурагч
-- classroom_members-ийг харж шалгах, classroom_members нь эргээд classrooms-ийг
-- харж шалгах mutual policy бол Postgres-т "infinite recursion detected in
-- policy" алдаа өгдөг тул хассан. Апп дотор сурагч тал classrooms хүснэгтийг
-- шууд уншдаггүй (join_classroom RPC-ээс ангийн нэрийг авдаг) тул хэрэггүй.

-- 3) Ангийн гишүүд (сурагч нэг ба олон ангид харьяалагдаж болно)
create table if not exists classroom_members (
  classroom_id uuid references classrooms(id) on delete cascade,
  student_user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (classroom_id, student_user_id)
);

alter table classroom_members enable row level security;

drop policy if exists "classroom_members_teacher_all" on classroom_members;
create policy "classroom_members_teacher_all" on classroom_members
  for all using (
    exists (select 1 from classrooms c where c.id = classroom_members.classroom_id and c.teacher_user_id = auth.uid())
  ) with check (
    exists (select 1 from classrooms c where c.id = classroom_members.classroom_id and c.teacher_user_id = auth.uid())
  );

drop policy if exists "classroom_members_self_select" on classroom_members;
create policy "classroom_members_self_select" on classroom_members
  for select using (auth.uid() = student_user_id);

-- Сурагч invite код ашиглаж өөрийгөө нэмэх — шууд INSERT биш, RPC-ээр
-- (код хүчинтэй эсэхийг сервер талд шалгаж, classroom_id-г л буцаана).
drop function if exists join_classroom(text);
create or replace function join_classroom(p_invite_code text)
returns table (classroom_id uuid, classroom_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_classroom_id uuid;
  v_name text;
begin
  select id, name into v_classroom_id, v_name from classrooms where invite_code = p_invite_code;
  if v_classroom_id is null then
    raise exception 'Буруу код байна';
  end if;

  insert into classroom_members (classroom_id, student_user_id)
  values (v_classroom_id, auth.uid())
  on conflict (classroom_id, student_user_id) do nothing;

  return query select v_classroom_id, v_name;
end;
$$;

grant execute on function join_classroom(text) to authenticated;

-- Багш сурагч хасах
drop function if exists teacher_remove_student(uuid, uuid);
create or replace function teacher_remove_student(p_classroom_id uuid, p_student_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from classrooms c where c.id = p_classroom_id and c.teacher_user_id = auth.uid()) then
    raise exception 'Зөвхөн энэ ангийн багш эрхтэй';
  end if;
  delete from classroom_members where classroom_id = p_classroom_id and student_user_id = p_student_user_id;
end;
$$;

grant execute on function teacher_remove_student(uuid, uuid) to authenticated;

-- 4) Тулааны түүх — цаг хугацааны график, сул тал илрүүлэхэд ашиглана.
create table if not exists battle_attempts_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  floor_index integer not null,
  outcome text not null check (outcome in ('won', 'lost')),
  correct_count integer not null,
  wrong_count integer not null,
  played_at timestamptz not null default now()
);

alter table battle_attempts_log enable row level security;

drop policy if exists "battle_attempts_log_owner_insert" on battle_attempts_log;
create policy "battle_attempts_log_owner_insert" on battle_attempts_log
  for insert with check (auth.uid() = user_id);

drop policy if exists "battle_attempts_log_owner_select" on battle_attempts_log;
create policy "battle_attempts_log_owner_select" on battle_attempts_log
  for select using (auth.uid() = user_id);
-- Багш өөрийн сурагчдын лог руу шууд RLS-ээр биш, доорх RPC-ээр л хандана.

-- 5) Багшийн dashboard-д зориулсан RPC-үүд

-- Ангийн ерөнхий тойм: сурагч бүрийн сүүлд идэвхтэй байсан огноо, нийт дийлсэн давхар.
drop function if exists teacher_classroom_overview(uuid);
create or replace function teacher_classroom_overview(p_classroom_id uuid)
returns table (
  student_user_id uuid,
  display_name text,
  last_active timestamptz,
  total_floors_cleared bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from classrooms c where c.id = p_classroom_id and c.teacher_user_id = auth.uid()) then
    raise exception 'Зөвхөн энэ ангийн багш харах эрхтэй';
  end if;

  return query
    select
      cm.student_user_id,
      split_part(u.email::text, '@', 1) as display_name,
      max(bal.played_at) as last_active,
      coalesce((
        select sum(greatest(tp.highest_cleared_floor + 1, 0))
        from tower_progress tp
        where tp.user_id = cm.student_user_id
      ), 0) as total_floors_cleared
    from classroom_members cm
    join auth.users u on u.id = cm.student_user_id
    left join battle_attempts_log bal on bal.user_id = cm.student_user_id
    where cm.classroom_id = p_classroom_id
    group by cm.student_user_id, u.email;
end;
$$;

grant execute on function teacher_classroom_overview(uuid) to authenticated;

-- Сурагчийн категори тус бүрийн зөв/буруу харьцаа (сул тал илрүүлэх).
drop function if exists teacher_student_breakdown(uuid, uuid);
create or replace function teacher_student_breakdown(p_classroom_id uuid, p_student_user_id uuid)
returns table (
  category_id uuid,
  category_name text,
  correct_total bigint,
  wrong_total bigint,
  accuracy numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from classrooms c where c.id = p_classroom_id and c.teacher_user_id = auth.uid()) then
    raise exception 'Зөвхөн энэ ангийн багш харах эрхтэй';
  end if;
  if not exists (
    select 1 from classroom_members cm
    where cm.classroom_id = p_classroom_id and cm.student_user_id = p_student_user_id
  ) then
    raise exception 'Тухайн сурагч энэ ангид алга';
  end if;

  return query
    select
      bal.category_id,
      c.name,
      sum(bal.correct_count) as correct_total,
      sum(bal.wrong_count) as wrong_total,
      round(100.0 * sum(bal.correct_count) / nullif(sum(bal.correct_count) + sum(bal.wrong_count), 0), 1) as accuracy
    from battle_attempts_log bal
    join categories c on c.id = bal.category_id
    where bal.user_id = p_student_user_id
    group by bal.category_id, c.name
    order by accuracy asc nulls last;
end;
$$;

grant execute on function teacher_student_breakdown(uuid, uuid) to authenticated;

-- Сурагчийн өдөр тутмын идэвх (сүүлийн 30 хоног) — цаг хугацааны график.
drop function if exists teacher_student_daily_activity(uuid, uuid);
create or replace function teacher_student_daily_activity(p_classroom_id uuid, p_student_user_id uuid)
returns table (activity_date date, floors_won bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from classrooms c where c.id = p_classroom_id and c.teacher_user_id = auth.uid()) then
    raise exception 'Зөвхөн энэ ангийн багш харах эрхтэй';
  end if;
  if not exists (
    select 1 from classroom_members cm
    where cm.classroom_id = p_classroom_id and cm.student_user_id = p_student_user_id
  ) then
    raise exception 'Тухайн сурагч энэ ангид алга';
  end if;

  return query
    select bal.played_at::date as activity_date, count(*) filter (where bal.outcome = 'won') as floors_won
    from battle_attempts_log bal
    where bal.user_id = p_student_user_id and bal.played_at > now() - interval '30 days'
    group by bal.played_at::date
    order by activity_date asc;
end;
$$;

grant execute on function teacher_student_daily_activity(uuid, uuid) to authenticated;
