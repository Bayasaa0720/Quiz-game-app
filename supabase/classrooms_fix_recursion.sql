-- classrooms.sql-ийг эхлээд ажиллуулсан хэрэглэгчид зориулсан засвар.
-- "infinite recursion detected in policy for relation classrooms" алдааг засна
-- (classrooms болон classroom_members policy хоорондоо мушгирсан лавлагаа хийж байсан).
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

drop policy if exists "classrooms_member_select" on classrooms;
