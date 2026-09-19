-- duels.sql-ийг аль хэдийн ажиллуулсан хэрэглэгчид зориулсан нэмэлт (v2):
-- - 60 секунд хариулаагүй бол автомат ялагдал (timeout forfeit)
-- - "waiting" хайлт орхигдвол дараагийн хайлтын үед автоматаар цэвэрлэх
-- - найздаа шууд дуэл урих (challenge) урсгал
-- - дуэлийн түүх харах RPC
-- - ялалтад оноо (20) олгох
--
-- ЭНЭ ФАЙЛЫГ economy.sql-ИЙН ДАРАА ажиллуулна уу (user_points хүснэгтийг
-- ашигладаг). Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

alter table duels add column if not exists round_started_at timestamptz not null default now();
alter table duels add column if not exists is_direct_challenge boolean not null default false;

-- duel_find_match: эхлэхийн өмнө миний хуучин "waiting" мөрийг цэвэрлэнэ,
-- зөвхөн нээлттэй queue-г (challenge биш) хайна, round эхлэх цагийг тэмдэглэнэ.
create or replace function duel_find_match(p_category_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
  v_question_ids uuid[];
begin
  delete from duels where player1_id = auth.uid() and status = 'waiting';

  select id into v_match_id
  from duels
  where category_id = p_category_id
    and status = 'waiting'
    and is_direct_challenge = false
    and player1_id <> auth.uid()
  order by created_at asc
  limit 1
  for update skip locked;

  if v_match_id is not null then
    update duels
    set player2_id = auth.uid(), status = 'active', round_started_at = now(), updated_at = now()
    where id = v_match_id;
    return v_match_id;
  end if;

  select array_agg(id) into v_question_ids
  from (select id from quiz_items where category_id = p_category_id order by random() limit 5) q;

  if v_question_ids is null or array_length(v_question_ids, 1) < 3 then
    raise exception 'Энэ сэдэвт хангалттай асуулт алга (доод тал нь 3 хэрэгтэй)';
  end if;

  insert into duels (category_id, player1_id, status, question_ids)
  values (p_category_id, auth.uid(), 'waiting', v_question_ids)
  returning id into v_match_id;

  return v_match_id;
end;
$$;

-- duel_submit_answer: round дуусахад round_started_at-ыг шинэчилнэ, тоглолт
-- дуусахад ялагчид 20 оноо олгоно.
create or replace function duel_submit_answer(p_match_id uuid, p_is_correct boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_p1 boolean;
  v_p1_answered boolean;
  v_p2_answered boolean;
  v_total_q int;
  v_cur_idx int;
  v_p1_score int;
  v_p2_score int;
  v_p1 uuid;
  v_p2 uuid;
  v_winner uuid;
begin
  select player1_id = auth.uid(), player1_round_answered, player2_round_answered,
         array_length(question_ids, 1), current_index, player1_score, player2_score,
         player1_id, player2_id
  into v_is_p1, v_p1_answered, v_p2_answered, v_total_q, v_cur_idx, v_p1_score, v_p2_score, v_p1, v_p2
  from duels
  where id = p_match_id and status = 'active'
  for update;

  if v_is_p1 is null or (not v_is_p1 and auth.uid() <> v_p2) then
    raise exception 'Тоглогч биш эсвэл идэвхгүй тоглолт';
  end if;

  if v_is_p1 then
    if v_p1_answered then return; end if;
    update duels set
      player1_round_answered = true,
      player1_score = player1_score + (case when p_is_correct then 1 else 0 end)
    where id = p_match_id;
    v_p1_answered := true;
  else
    if v_p2_answered then return; end if;
    update duels set
      player2_round_answered = true,
      player2_score = player2_score + (case when p_is_correct then 1 else 0 end)
    where id = p_match_id;
    v_p2_answered := true;
  end if;

  if v_p1_answered and v_p2_answered then
    if v_cur_idx + 1 >= v_total_q then
      select case when d.player1_score > d.player2_score then d.player1_id
                  when d.player2_score > d.player1_score then d.player2_id
                  else null end
      into v_winner
      from duels d where d.id = p_match_id;

      update duels set status = 'finished', winner_id = v_winner, updated_at = now()
      where id = p_match_id;

      if v_winner is not null then
        insert into user_points (user_id, balance, updated_at)
        values (v_winner, 20, now())
        on conflict (user_id) do update set balance = user_points.balance + 20, updated_at = now();
      end if;
    else
      update duels set
        current_index = current_index + 1,
        player1_round_answered = false,
        player2_round_answered = false,
        round_started_at = now(),
        updated_at = now()
      where id = p_match_id;
    end if;
  end if;
end;
$$;

-- Хариу хүлээгдэж буй тал 60 секундээс дээш хугацаагаар хариулаагүй бол,
-- аль хэдийн хариулсан тал тоглолтыг өөрийн ялалтаар албадан дуусгаж болно.
create or replace function duel_claim_timeout_win(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_p1 boolean;
  v_my_answered boolean;
  v_opp_answered boolean;
  v_round_started timestamptz;
begin
  select player1_id = auth.uid(),
         case when player1_id = auth.uid() then player1_round_answered else player2_round_answered end,
         case when player1_id = auth.uid() then player2_round_answered else player1_round_answered end,
         round_started_at
  into v_is_p1, v_my_answered, v_opp_answered, v_round_started
  from duels
  where id = p_match_id and status = 'active' and (player1_id = auth.uid() or player2_id = auth.uid())
  for update;

  if v_is_p1 is null then
    raise exception 'Тоглогч биш эсвэл идэвхгүй тоглолт';
  end if;
  if not v_my_answered or v_opp_answered then
    raise exception 'Timeout нөхцөл хараахан биелээгүй байна';
  end if;
  if now() - v_round_started < interval '60 seconds' then
    raise exception 'Хараахан 60 секунд болоогүй байна';
  end if;

  update duels set status = 'finished', winner_id = auth.uid(), updated_at = now()
  where id = p_match_id;

  insert into user_points (user_id, balance, updated_at)
  values (auth.uid(), 20, now())
  on conflict (user_id) do update set balance = user_points.balance + 20, updated_at = now();
end;
$$;

grant execute on function duel_claim_timeout_win(uuid) to authenticated;

-- Найздаа шууд дуэл урих.
create or replace function duel_challenge_friend(p_friend_id uuid, p_category_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
  v_question_ids uuid[];
begin
  if not exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = p_friend_id)
        or (requester_id = p_friend_id and addressee_id = auth.uid()))
  ) then
    raise exception 'Та энэ хэрэглэгчтэй найз биш байна';
  end if;

  delete from duels where player1_id = auth.uid() and status = 'waiting';

  select array_agg(id) into v_question_ids
  from (select id from quiz_items where category_id = p_category_id order by random() limit 5) q;

  if v_question_ids is null or array_length(v_question_ids, 1) < 3 then
    raise exception 'Энэ сэдэвт хангалттай асуулт алга (доод тал нь 3 хэрэгтэй)';
  end if;

  insert into duels (category_id, player1_id, player2_id, status, question_ids, is_direct_challenge)
  values (p_category_id, auth.uid(), p_friend_id, 'waiting', v_question_ids, true)
  returning id into v_match_id;

  return v_match_id;
end;
$$;

grant execute on function duel_challenge_friend(uuid, uuid) to authenticated;

-- Надад ирсэн, хараахан хариулаагүй урилгууд.
create or replace function duel_get_pending_challenges()
returns table (match_id uuid, category_id uuid, category_name text, challenger_name text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select d.id, d.category_id, c.name, split_part(u.email::text, '@', 1), d.created_at
  from duels d
  join categories c on c.id = d.category_id
  join auth.users u on u.id = d.player1_id
  where d.player2_id = auth.uid() and d.status = 'waiting' and d.is_direct_challenge = true
  order by d.created_at desc;
$$;

grant execute on function duel_get_pending_challenges() to authenticated;

create or replace function duel_accept_challenge(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update duels
  set status = 'active', round_started_at = now(), updated_at = now()
  where id = p_match_id and player2_id = auth.uid() and status = 'waiting' and is_direct_challenge = true;

  if not found then
    raise exception 'Урилга олдсонгүй эсвэл аль хэдийн хугацаа өнгөрсөн';
  end if;
end;
$$;

grant execute on function duel_accept_challenge(uuid) to authenticated;

create or replace function duel_decline_challenge(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from duels where id = p_match_id and player2_id = auth.uid() and status = 'waiting' and is_direct_challenge = true;
end;
$$;

grant execute on function duel_decline_challenge(uuid) to authenticated;

-- Дуэлийн түүх (дууссан тоглолтууд).
create or replace function duel_get_my_history(p_limit int default 20)
returns table (
  match_id uuid, category_name text, my_score int, opponent_score int,
  opponent_name text, result text, played_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    d.id,
    c.name,
    case when d.player1_id = auth.uid() then d.player1_score else d.player2_score end,
    case when d.player1_id = auth.uid() then d.player2_score else d.player1_score end,
    case when d.player1_id = auth.uid()
      then split_part(u2.email::text, '@', 1)
      else split_part(u1.email::text, '@', 1) end,
    case when d.winner_id = auth.uid() then 'win'
         when d.winner_id is null then 'tie'
         else 'lose' end,
    d.updated_at
  from duels d
  join categories c on c.id = d.category_id
  left join auth.users u1 on u1.id = d.player1_id
  left join auth.users u2 on u2.id = d.player2_id
  where d.status = 'finished' and (d.player1_id = auth.uid() or d.player2_id = auth.uid())
  order by d.updated_at desc
  limit p_limit;
$$;

grant execute on function duel_get_my_history(int) to authenticated;

-- duel_get_match-д round_started_at-ыг нэмж буцаана (timeout тооцоход).
-- Буцаах баганын бүтэц өөрчлөгдсөн тул CREATE OR REPLACE хийхийн өмнө
-- хуучин функцийг устгах ёстой (Postgres OUT parameter row type-ийг
-- шууд солиход зөвшөөрдөггүй).
drop function if exists duel_get_match(uuid);
create or replace function duel_get_match(p_match_id uuid)
returns table (
  id uuid, category_id uuid, player1_id uuid, player2_id uuid, status text,
  question_ids uuid[], current_index int, player1_score int, player2_score int,
  player1_round_answered boolean, player2_round_answered boolean, winner_id uuid,
  player1_name text, player2_name text, round_started_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select d.id, d.category_id, d.player1_id, d.player2_id, d.status,
    d.question_ids, d.current_index, d.player1_score, d.player2_score,
    d.player1_round_answered, d.player2_round_answered, d.winner_id,
    split_part(u1.email::text, '@', 1), split_part(u2.email::text, '@', 1),
    d.round_started_at
  from duels d
  left join auth.users u1 on u1.id = d.player1_id
  left join auth.users u2 on u2.id = d.player2_id
  where d.id = p_match_id and (d.player1_id = auth.uid() or d.player2_id = auth.uid());
$$;

grant execute on function duel_get_match(uuid) to authenticated;
