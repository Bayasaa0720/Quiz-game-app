-- Өдрийн даалгавар (Tower Climb App.html deck-ийн Дэлгүүр -> "Өдрийн
-- даалгавар" sub-tab). Achievements.sql-тай ижил хэв маяг: даалгаврын
-- төлөв бүрэн сервер талд (battle_attempts_log/duels-аас) тооцоологдоно,
-- client зөвхөн claim_daily_quest() RPC-ээр л coin авна.
--
-- Ажиллуулах дараалал: classrooms.sql, achievements.sql, economy.sql,
-- duels.sql-ийн дараа (эдгээрийн хүснэгт/баганыг ашигладаг тул).
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create table if not exists user_daily_quest_claims (
  user_id uuid references auth.users(id) on delete cascade,
  quest_id text not null,
  quest_date date not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_id, quest_date)
);

alter table user_daily_quest_claims enable row level security;

drop policy if exists "user_daily_quest_claims_owner_select" on user_daily_quest_claims;
create policy "user_daily_quest_claims_owner_select" on user_daily_quest_claims
  for select using (auth.uid() = user_id);
-- Санаатайгаар INSERT policy алга — бүх бичилт claim_daily_quest() RPC-ээр.

-- Өнөөдрийн 4 даалгаврын явц + coin шагнал + аль хэдийн авсан эсэх.
drop function if exists get_daily_quests();
create or replace function get_daily_quests()
returns table(quest_id text, label text, target int, progress int, coin_reward int, claimed boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_floors_won int;
  v_flawless int;
  v_duels_played int;
  v_duels_won int;
begin
  select count(*) into v_floors_won from battle_attempts_log
    where user_id = auth.uid() and outcome = 'won' and created_at::date = current_date;
  select count(*) into v_flawless from battle_attempts_log
    where user_id = auth.uid() and outcome = 'won' and wrong_count = 0 and created_at::date = current_date;
  select count(*) into v_duels_played from duels
    where (player1_id = auth.uid() or player2_id = auth.uid()) and status = 'finished' and updated_at::date = current_date;
  select count(*) into v_duels_won from duels
    where winner_id = auth.uid() and status = 'finished' and updated_at::date = current_date;

  return query
  select 'daily_3_floors'::text, '3 давхар дийл'::text, 3, least(v_floors_won, 3), 15,
    exists (select 1 from user_daily_quest_claims where user_id = auth.uid() and quest_id = 'daily_3_floors' and quest_date = current_date)
  union all
  select 'daily_flawless'::text, 'Цэвэр ялалт ав'::text, 1, least(v_flawless, 1), 10,
    exists (select 1 from user_daily_quest_claims where user_id = auth.uid() and quest_id = 'daily_flawless' and quest_date = current_date)
  union all
  select 'daily_duel_play'::text, 'Дуэл тогло'::text, 1, least(v_duels_played, 1), 10,
    exists (select 1 from user_daily_quest_claims where user_id = auth.uid() and quest_id = 'daily_duel_play' and quest_date = current_date)
  union all
  select 'daily_duel_win'::text, 'Дуэлд ялах'::text, 1, least(v_duels_won, 1), 20,
    exists (select 1 from user_daily_quest_claims where user_id = auth.uid() and quest_id = 'daily_duel_win' and quest_date = current_date);
end;
$$;

grant execute on function get_daily_quests() to authenticated;

-- Даалгавар биелсэн бол coin олгож, дахин авахаас хамгаална (primary key
-- (user_id, quest_id, quest_date) давхар insert-ийг өөрөө хориглодог ч
-- урьдчилж шалгаж илүү тодорхой алдаа буцаана).
drop function if exists claim_daily_quest(text);
create or replace function claim_daily_quest(p_quest_id text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_new_balance numeric;
begin
  select * into v_row from get_daily_quests() where quest_id = p_quest_id;
  if v_row is null then
    raise exception 'Тодорхойгүй даалгавар';
  end if;
  if v_row.claimed then
    raise exception 'Энэ даалгаврыг өнөөдөр аль хэдийн авсан байна';
  end if;
  if v_row.progress < v_row.target then
    raise exception 'Даалгавар хараахан биелээгүй байна';
  end if;

  insert into user_daily_quest_claims (user_id, quest_id, quest_date)
  values (auth.uid(), p_quest_id, current_date);

  insert into user_points (user_id, balance, updated_at)
  values (auth.uid(), v_row.coin_reward, now())
  on conflict (user_id) do update set balance = user_points.balance + v_row.coin_reward, updated_at = now();

  select balance into v_new_balance from user_points where user_id = auth.uid();
  return v_new_balance;
end;
$$;

grant execute on function claim_daily_quest(text) to authenticated;
