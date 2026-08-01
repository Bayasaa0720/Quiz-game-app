-- Phase 5: Admin шалгах функц (апп дотроос "Давхар шинэчлэх" товч харуулах эсэхийг мэдэхийн тулд).
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.
-- app_admins хүснэгтэд шууд SELECT эрх байхгүй тул, security-definer функцээр
-- дамжуулж, дуудсан хэрэглэгч өөрөө admin мөн эсэхийг л шалгуулна (бусад
-- хэрэглэгчийн мэдээлэл алдагдахгүй).

create or replace function is_app_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from app_admins where user_id = auth.uid());
$$;
