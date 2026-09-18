-- Achievement/badge систем.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

create table if not exists user_achievements (
  user_id uuid references auth.users(id) on delete cascade,
  achievement_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table user_achievements enable row level security;

create policy "user_achievements_owner_select" on user_achievements
  for select using (auth.uid() = user_id);

create policy "user_achievements_owner_insert" on user_achievements
  for insert with check (auth.uid() = user_id);
