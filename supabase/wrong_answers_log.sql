-- Буруу хариулсан асуултыг хэдэн удаа андуурсаныг хадгалж, Review
-- (Сэргээх) горимд сул асуулт руу илүү их жинлэж сонгоход ашиглана.
-- Battle.jsx-ийн missedQuestions нь тулаан бүрт зөвхөн нэг удаа харагдаад
-- алга болдог байсан — энэ хүснэгт тоглогчийн БҮХ түүхийн андуурлыг хадгална.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create table if not exists wrong_answers_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references quiz_items(id) on delete cascade,
  miss_count integer not null default 1,
  last_missed_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table wrong_answers_log enable row level security;

drop policy if exists "wrong_answers_log_owner_select" on wrong_answers_log;
create policy "wrong_answers_log_owner_select" on wrong_answers_log
  for select using (auth.uid() = user_id);
-- Санаатайгаар insert/update policy алга — бичилт зөвхөн доорх
-- log_wrong_answer() RPC-ээр, incremenet атомаар хийгдэнэ.

drop function if exists log_wrong_answer(uuid);
create or replace function log_wrong_answer(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into wrong_answers_log (user_id, question_id, miss_count, last_missed_at)
  values (auth.uid(), p_question_id, 1, now())
  on conflict (user_id, question_id)
  do update set miss_count = wrong_answers_log.miss_count + 1, last_missed_at = now();
end;
$$;

grant execute on function log_wrong_answer(uuid) to authenticated;
