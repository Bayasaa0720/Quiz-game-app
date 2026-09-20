-- Профайл засах: зураг (жинхэнэ файл upload, Supabase Storage) + display name.
-- Дахин ажиллуулахад аюулгүй (policy бүр DROP IF EXISTS-ийн ард орсон).
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

alter table user_profiles add column if not exists display_name text;
alter table user_profiles add column if not exists avatar_url text;

-- "avatars" нэртэй нийтэд unшигдах (public read) Storage bucket. Файл бүр
-- <user_id>/<файлын нэр> замд хадгалагдана — доорх policy-ууд яг энэ
-- бүтцэд тулгуурлан "эхний хавтас нэр = auth.uid()" эсэхийг шалгадаг.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- user_profiles дээр ерөнхий UPDATE policy санаатайгаар алга (role-ыг
-- тогтмол хамгаалахын тулд, classrooms.sql харна уу) — тиймээс
-- display_name/avatar_url-ыг зөвхөн энэ RPC-ээр л шинэчилнэ, role болон
-- equipped_item_id-д хүрэхгүй.
drop function if exists update_my_profile(text, text);
create or replace function update_my_profile(p_display_name text, p_avatar_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update user_profiles
  set display_name = p_display_name, avatar_url = p_avatar_url
  where user_id = auth.uid();
end;
$$;

grant execute on function update_my_profile(text, text) to authenticated;
