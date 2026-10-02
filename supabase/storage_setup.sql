-- CS2 асуултын зурагнуудыг байршуулах public Storage bucket үүсгэх.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

insert into storage.buckets (id, name, public)
values ('quiz-images', 'quiz-images', true)
on conflict (id) do nothing;

drop policy if exists "quiz-images public read" on storage.objects;
create policy "quiz-images public read" on storage.objects
  for select using (bucket_id = 'quiz-images');

-- Аюулгүйн тэмдэглэл (2026-10-02 audit): өмнө нь энэ policy нэвтэрсэн ЭЙ
-- хэрэглэгчид bucket доторх АЛЬ ч замд (MIME/хэмжээ шалгалтгүй) upload
-- хийх боломж олгодог байсан (profile_avatar.sql-ийн avatars bucket-той
-- адил <user_id>/... хавтаст хязгаарлаагүй). Одоо avatars-тай ижил
-- хэв маягаар өөрийн хавтас руугаа, зөвхөн зурган файл upload хийхээр
-- хязгаарлав.
drop policy if exists "quiz-images authenticated upload" on storage.objects;
create policy "quiz-images authenticated upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'quiz-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and coalesce(metadata->>'mimetype', '') like 'image/%'
  );

drop policy if exists "quiz-images owner update" on storage.objects;
create policy "quiz-images owner update" on storage.objects
  for update using (bucket_id = 'quiz-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "quiz-images owner delete" on storage.objects;
create policy "quiz-images owner delete" on storage.objects
  for delete using (bucket_id = 'quiz-images' and (storage.foldername(name))[1] = auth.uid()::text);
