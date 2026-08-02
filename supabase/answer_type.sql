-- Зурган хариултуудыг төрлөөр нь ангилах (жишээ нь 'flag', 'map'),
-- ингэснээр буруу сонголтуудыг ижил төрлийн зурагнуудаас илүү тохиромжтой сонгож болно.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

alter table quiz_items
  add column if not exists answer_type text;

comment on column quiz_items.answer_type is 'Зурган хариултын төрөл (жишээ: flag, map). Текст хариулттай асуултад null байна.';
