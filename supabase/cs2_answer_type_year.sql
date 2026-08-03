-- "Хэдэн онд..." төрлийн он-хариулттай асуултуудыг тусад нь 'year' төрөлд оноож,
-- багийн нэр/улс/амьтан гэх мэт бусад текст хариулттай холилдохгүй болгоно.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

update quiz_items set answer_type = 'year'
  where quiz_question in (
    'G2 Esports хэдэн онд байгуулагдсан бэ?',
    'NAVI хэдэн онд байгуулагдсан бэ?',
    'Astralis хэдэн онд байгуулагдсан бэ?',
    'FaZe Clan хэдэн онд байгуулагдсан бэ?',
    'Ancient map хэдэн онд CS:GO-д нэмэгдсэн бэ?'
  );

-- Баталгаажуулах
select quiz_question, correct_answer, answer_type
from quiz_items
where answer_type = 'year';
