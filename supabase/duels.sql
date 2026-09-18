-- Realtime 1v1 duel систем (v5 BRD Feature 04-C).
-- Тоглогч 2 нэг ангиллаас 5 санамсаргүй асуулт хамтдаа авч, хамгийн олон
-- зөв хариулсан нь ялна. Бүх бичилт (insert/update) SECURITY DEFINER
-- RPC-ээр л хийгдэнэ — шууд client INSERT/UPDATE policy алга.
--
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу. Мөн Database -> Replication
-- дотор "duels" хүснэгтэд Realtime асаалттай эсэхийг шалгаарай (анхдагчаар
-- public schema-ийн шинэ хүснэгт realtime publication-д автоматаар нэмэгддэг).

create table if not exists duels (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  player1_id uuid references auth.users(id) on delete cascade,
  player2_id uuid references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  question_ids uuid[] not null,
  current_index int not null default 0,
  player1_score int not null default 0,
  player2_score int not null default 0,
  player1_round_answered boolean not null default false,
  player2_round_answered boolean not null default false,
  winner_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table duels enable row level security;

create policy "duels_participant_select" on duels
  for select using (auth.uid() = player1_id or auth.uid() = player2_id);

alter publication supabase_realtime add table duels;

-- Тоглогч хайх: нээлттэй ижил ангиллын тоглолт байвал нэгдэнэ, эсэрхий
-- бол шинэ тоглолт үүсгэж, өрсөлдөгч хүлээнэ.
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
  select id into v_match_id
  from duels
  where category_id = p_category_id
    and status = 'waiting'
    and player1_id <> auth.uid()
  order by created_at asc
  limit 1
  for update skip locked;

  if v_match_id is not null then
    update duels
    set player2_id = auth.uid(), status = 'active', updated_at = now()
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

grant execute on function duel_find_match(uuid) to authenticated;

-- Хайлт цуцлах (зөвхөн хараахан өрсөлдөгчгүй байгаа өөрийн тоглолт).
create or replace function duel_cancel_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from duels where id = p_match_id and player1_id = auth.uid() and status = 'waiting';
end;
$$;

grant execute on function duel_cancel_match(uuid) to authenticated;

-- Тухайн асуултад хариулав: оноо нэмэх, хоёр тал хариулсан бол дараагийн
-- асуулт руу шилжих эсвэл дуусгах.
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
      update duels d set
        status = 'finished',
        winner_id = case when d.player1_score > d.player2_score then d.player1_id
                         when d.player2_score > d.player1_score then d.player2_id
                         else null end,
        updated_at = now()
      where d.id = p_match_id;
    else
      update duels set
        current_index = current_index + 1,
        player1_round_answered = false,
        player2_round_answered = false,
        updated_at = now()
      where id = p_match_id;
    end if;
  end if;
end;
$$;

grant execute on function duel_submit_answer(uuid, boolean) to authenticated;

-- Тоглолтын мөрийг тоглогчдын нэртэй нь хамт унших (polling fallback + анхны ачаалалт).
create or replace function duel_get_match(p_match_id uuid)
returns table (
  id uuid, category_id uuid, player1_id uuid, player2_id uuid, status text,
  question_ids uuid[], current_index int, player1_score int, player2_score int,
  player1_round_answered boolean, player2_round_answered boolean, winner_id uuid,
  player1_name text, player2_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select d.id, d.category_id, d.player1_id, d.player2_id, d.status,
    d.question_ids, d.current_index, d.player1_score, d.player2_score,
    d.player1_round_answered, d.player2_round_answered, d.winner_id,
    split_part(u1.email::text, '@', 1), split_part(u2.email::text, '@', 1)
  from duels d
  left join auth.users u1 on u1.id = d.player1_id
  left join auth.users u2 on u2.id = d.player2_id
  where d.id = p_match_id and (d.player1_id = auth.uid() or d.player2_id = auth.uid());
$$;

grant execute on function duel_get_match(uuid) to authenticated;
