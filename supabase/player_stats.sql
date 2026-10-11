-- Тоглогч өөрийн сэдэв тус бүрийн зөв/буруу статистикийг (нарийвчлал)
-- харах боломж. battle_attempts_log аль хэдийн бичигддэг (classrooms.sql),
-- мөн teacher_student_breakdown() ижил логикоор багшид харуулдаг байсан —
-- тоглогч өөрөөсөө харах эквивалент дутуу байсныг энд нөхнө.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу (classrooms.sql-ийн дараа).

drop function if exists my_category_breakdown();
create or replace function my_category_breakdown()
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
  return query
    select
      bal.category_id,
      c.name,
      sum(bal.correct_count) as correct_total,
      sum(bal.wrong_count) as wrong_total,
      round(100.0 * sum(bal.correct_count) / nullif(sum(bal.correct_count) + sum(bal.wrong_count), 0), 1) as accuracy
    from battle_attempts_log bal
    join categories c on c.id = bal.category_id
    where bal.user_id = auth.uid()
    group by bal.category_id, c.name
    order by accuracy asc nulls last;
end;
$$;

grant execute on function my_category_breakdown() to authenticated;
