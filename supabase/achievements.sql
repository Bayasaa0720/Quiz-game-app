-- Achievement/badge систем.
-- Дахин ажиллуулахад аюулгүй (policy/функц бүр DROP IF EXISTS-ийн ард орсон).
--
-- SECURITY: client-ээс шууд insert хийдэггүй (доор харна уу) — зөвхөн
-- claim_achievement() RPC-ээр, тухайн achievement-ийг жинхэнэ ёсоор
-- хангасан эсэхийг сервер талд (tower_progress/battle_attempts_log/duels/
-- get_leaderboard-аас) шалгаад л insert хийдэг. Энэ файл classrooms.sql
-- (battle_attempts_log), duels.sql, leaderboard.sql-аас хамааралтай тул
-- эдгээрийн ДАРАА ажиллуулна (эсрэгээрээ ч function биелэлт хийхдээ л
-- эдгээр объект хэрэгтэй болдог тул CREATE үед алдаа өгөхгүй).
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create table if not exists user_achievements (
  user_id uuid references auth.users(id) on delete cascade,
  achievement_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table user_achievements enable row level security;

drop policy if exists "user_achievements_owner_select" on user_achievements;
create policy "user_achievements_owner_select" on user_achievements
  for select using (auth.uid() = user_id);

-- Санаатайгаар INSERT policy алга — client шууд бичиж чадахгүй (өмнө нь
-- "auth.uid() = user_id" гэсэн эзэмшлийн шалгалт л байсан бөгөөд
-- achievement_id ямар ч байсан хамаагүй бичигдэж, зохисгүй coin олгодог
-- цоорхойтой байсныг эндээс хаав). Бүх бичилт claim_achievement() RPC-ээр.

-- Achievement тус бүрийг жинхэнэ ёсоор хангасан эсэхийг сервер талд
-- баталгаажуулж, зөвшөөрөгдвөл л user_achievements-д insert хийнэ.
-- Буцаах утга: анх удаа шинээр авсан бол true, аль хэдийн байсан эсвэл
-- нөхцөл хангаагүй бол false.
drop function if exists claim_achievement(text);
create or replace function claim_achievement(p_achievement_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eligible boolean := false;
begin
  if p_achievement_id = 'first_floor' then
    v_eligible := exists (
      select 1 from tower_progress where user_id = auth.uid() and highest_cleared_floor >= 0
    );
  elsif p_achievement_id = 'flawless_floor' then
    v_eligible := exists (
      select 1 from battle_attempts_log
      where user_id = auth.uid() and outcome = 'won' and wrong_count = 0
    );
  elsif p_achievement_id = 'tower_complete' then
    v_eligible := exists (
      select 1
      from tower_progress tp
      join (
        select category_id, max(floor_index) as max_floor
        from tower_floors
        group by category_id
      ) tf on tf.category_id = tp.category_id
      where tp.user_id = auth.uid() and tp.highest_cleared_floor >= tf.max_floor
    );
  elsif p_achievement_id = 'duel_first_win' then
    v_eligible := exists (
      select 1 from duels where status = 'finished' and winner_id = auth.uid()
    );
  elsif p_achievement_id = 'leaderboard_top1' then
    v_eligible := exists (
      select 1 from get_leaderboard(null, 1) gl where gl.user_id = auth.uid() and gl.rank = 1
    );
  else
    raise exception 'Тодорхойгүй achievement: %', p_achievement_id;
  end if;

  if not v_eligible then
    return false;
  end if;

  insert into user_achievements (user_id, achievement_id)
  values (auth.uid(), p_achievement_id)
  on conflict (user_id, achievement_id) do nothing;

  return found;
end;
$$;

grant execute on function claim_achievement(text) to authenticated;
