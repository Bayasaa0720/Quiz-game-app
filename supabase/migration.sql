-- Quiz Master: Neon-ээс Supabase руу шилжих migration
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.
-- Одоо байгаа categories/quiz_items хүснэгтийг хадгалж, олон-хэрэглэгчийн
-- эрхийн хамгаалалт (RLS) нэмнэ.

-- 1. categories-д user_id багана нэмэх (одоогийн 3 ангилал бүгд public/эзэнгүй байсан)
alter table public.categories
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Одоо байгаа 3 ангилалыг өөрийн (аль хэдийн quiz_items-д ашиглагдаж байгаа) акаунт руу оноох
update public.categories
  set user_id = '6c31c337-08ad-4694-aa7b-33d31ca50b88'
  where user_id is null;

alter table public.categories
  alter column user_id set not null;

-- Нэг хэрэглэгч ижил нэртэй ангилал давхардуулж үүсгэхээс сэргийлэх
drop index if exists categories_name_user_unique;
create unique index categories_name_user_unique on public.categories (name, user_id);

-- 2. quiz_items-д зурган хариулт дэмжих багана нэмэх (Neon-ий шинэ функц)
alter table public.quiz_items
  add column if not exists answer_image_url text;

-- 3. Row Level Security идэвхжүүлж, эзэмшигчээс өөр хэн ч
--    унших/засах/устгах боломжгүй болгох
alter table public.categories enable row level security;
alter table public.quiz_items enable row level security;

drop policy if exists "categories_owner_all" on public.categories;
create policy "categories_owner_all" on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "quiz_items_owner_all" on public.quiz_items;
create policy "quiz_items_owner_all" on public.quiz_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
