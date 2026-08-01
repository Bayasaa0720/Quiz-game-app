-- 1-р хэсэг: одоо байгаа бүх policy-г харах (диагностик)
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('categories', 'quiz_items');

-- 2-р хэсэг: categories/quiz_items дээрх БҮХ хуучин policy-г устгаад
-- зөвхөн owner-only policy үлдээх
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where tablename in ('categories', 'quiz_items')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

alter table public.categories enable row level security;
alter table public.quiz_items enable row level security;

create policy "categories_owner_all" on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quiz_items_owner_all" on public.quiz_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3-р хэсэг: баталгаажуулах — зөвхөн owner-only 1 policy тус бүр хүснэгтэд байх ёстой
select schemaname, tablename, policyname, cmd
from pg_policies
where tablename in ('categories', 'quiz_items');
