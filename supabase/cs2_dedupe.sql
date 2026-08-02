-- cs2_content_v2.sql давхар ажилласнаас үүссэн давхардсан асуултуудыг цэвэрлэх.
-- Ижил category_id + асуулт + хариулт бүхий давхардсан мөрүүдээс хамгийн эртийг нь
-- (хамгийн бага id) үлдээж, бусдыг устгана.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

with ranked as (
  select
    id,
    row_number() over (
      partition by
        category_id,
        quiz_question,
        coalesce(question_image_url, ''),
        coalesce(correct_answer, ''),
        coalesce(answer_image_url, '')
      order by id
    ) as rn
  from quiz_items
  where category_id in (
    select id from categories where name in ('cs2 teams', 'cs2 players', 'cs2 map knowledge')
  )
)
delete from quiz_items where id in (select id from ranked where rn > 1);

-- Баталгаажуулах: тус бүр 15 асуулттай байх ёстой
select c.name, count(*) as asuult_too
from quiz_items qi
join categories c on c.id = qi.category_id
where c.name in ('cs2 teams', 'cs2 players', 'cs2 map knowledge')
group by c.name;
