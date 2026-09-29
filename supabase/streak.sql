-- Өдөр дараалсан идэвхийн streak (Tower Climb App.html deck-ийн header дэх
-- "N хоног" pill) — шинэ хүснэгт ШААРДЛАГАГҮЙ, зөвхөн battle_attempts_log-оос
-- (аль хэдийн байгаа) тооцоолно: өнөөдрөөс эхлээд ялалттай өдрүүдийг цуваа
-- тасрах хүртэл ухраад тоолно.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу (classrooms.sql-ийн дараа,
-- battle_attempts_log хүснэгтийг ашигладаг тул).

drop function if exists get_my_streak();
create or replace function get_my_streak()
returns int
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_streak int := 0;
  v_day date := current_date;
begin
  loop
    exit when not exists (
      select 1 from battle_attempts_log
      where user_id = auth.uid() and outcome = 'won' and created_at::date = v_day
    );
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;
  return v_streak;
end;
$$;

grant execute on function get_my_streak() to authenticated;
