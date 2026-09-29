-- Зочны горим (Onboarding-ийн "Бүртгүүлэхгүйгээр туршиж үзэх") — нэвтрээгүй
-- (anon) хэрэглэгчид ЗӨВХӨН нийтэд нээлттэй (is_global = true) World tower-
-- уудыг унших боломж олгоно. Одоо байгаа RLS policy-ууд
-- (global_towers.sql: categories_select/quiz_items_select/
-- tower_floors_owner_select) аль хэдийн "is_global = true" мөрүүдийг ямар ч
-- auth.uid()-тэй ч (анонимоос оролдоод auth.uid() нь null байсан ч) зөвшөөрдөг
-- — зөвхөн ТАБЛИЙН grant дутуу байсан тул anon role-д уншихыг зөвшөөрнө.
-- Бичих (insert/update/delete) grant огт өгөхгүй — зочин ямар ч мөр бичихгүй,
-- App.jsx талд зочны явц зөвхөн React state-д (local/ephemeral) хадгалагдана.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

grant select on public.categories to anon;
grant select on public.quiz_items to anon;
grant select on public.tower_floors to anon;
