-- CS2 esports trivia агуулга: cs2 teams / cs2 players / cs2 map knowledge
-- ЭХЛЭЭД answer_type.sql-ийг ажиллуулсан байх ёстой.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.
-- Хэрэв танай хэрэглэгчийн UUID өөр бол доорх v_user_id-г солино уу.

do $$
declare
  v_user_id uuid := '6c31c337-08ad-4694-aa7b-33d31ca50b88';
  v_teams_id uuid;
  v_players_id uuid;
  v_maps_id uuid;
begin
  -- Ангиллууд (байхгүй бол үүсгэнэ)
  insert into categories (name, user_id)
    values ('cs2 teams', v_user_id)
    on conflict do nothing;
  select id into v_teams_id from categories where name = 'cs2 teams' and user_id = v_user_id;

  insert into categories (name, user_id)
    values ('cs2 players', v_user_id)
    on conflict do nothing;
  select id into v_players_id from categories where name = 'cs2 players' and user_id = v_user_id;

  insert into categories (name, user_id)
    values ('cs2 map knowledge', v_user_id)
    on conflict do nothing;
  select id into v_maps_id from categories where name = 'cs2 map knowledge' and user_id = v_user_id;

  -- === cs2 teams ===
  insert into quiz_items (category_id, user_id, quiz_question, question_image_url, correct_answer, answer_image_url, answer_type, difficulty) values
  (v_teams_id, v_user_id, 'NAVI (Natus Vincere) аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Flag_of_Ukraine.svg/330px-Flag_of_Ukraine.svg.png', 'flag', 'easy'),
  (v_teams_id, v_user_id, 'Vitality аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Flag_of_France.svg/330px-Flag_of_France.svg.png', 'flag', 'easy'),
  (v_teams_id, v_user_id, 'CS:GO/CS2-ийн түүхэнд хамгийн олон (4) Major аваргатай баг аль нь вэ?', null, 'Astralis', null, null, 'normal'),
  (v_teams_id, v_user_id, 'Astralis аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Flag_of_Denmark.svg/250px-Flag_of_Denmark.svg.png', 'flag', 'normal'),
  (v_teams_id, v_user_id, 'fnatic анх 2013 онд аль Major-ийг ялсан бэ?', null, 'DreamHack Winter 2013', null, null, 'hard'),
  (v_teams_id, v_user_id, 'Team Spirit аль улсын байгууллага вэ?', null, 'Орос', null, null, 'normal'),
  (v_teams_id, v_user_id, 'G2 Esports-ийн лого дээр ямар амьтан дүрслэгдсэн вэ?', null, 'Баавгай (Ursa)', null, null, 'hard');

  -- === cs2 players ===
  insert into quiz_items (category_id, user_id, quiz_question, question_image_url, correct_answer, answer_image_url, answer_type, difficulty) values
  (v_players_id, v_user_id, 's1mple-ийн жинхэнэ нэр хэн бэ?', null, 'Oleksandr Kostyliev', null, null, 'easy'),
  (v_players_id, v_user_id, 'ZywOo аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Flag_of_France.svg/330px-Flag_of_France.svg.png', 'flag', 'easy'),
  (v_players_id, v_user_id, 's1mple аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Flag_of_Ukraine.svg/330px-Flag_of_Ukraine.svg.png', 'flag', 'normal'),
  (v_players_id, v_user_id, '2021 оны PGL Major Stockholm-ийн MVP хэн байсан бэ?', null, 'ZywOo', null, null, 'hard'),
  (v_players_id, v_user_id, 'donk (Данил Крышковец) аль улсаас гаралтай вэ?', null, 'Орос', null, null, 'normal'),
  (v_players_id, v_user_id, 'NiKo-гийн жинхэнэ нэр хэн бэ?', null, 'Nikola Kovač', null, null, 'easy'),
  (v_players_id, v_user_id, 'NiKo аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Flag_of_Bosnia_and_Herzegovina.svg/330px-Flag_of_Bosnia_and_Herzegovina.svg.png', 'flag', 'hard');

  -- === cs2 map knowledge ===
  insert into quiz_items (category_id, user_id, quiz_question, question_image_url, correct_answer, answer_image_url, answer_type, difficulty) values
  (v_maps_id, v_user_id, 'Mirage map дээр Terrorist талаас Window (A site) рүү instant smoke хийдэг хичнээн spawn байдаг вэ?', null, '5', null, null, 'hard'),
  (v_maps_id, v_user_id, 'Dust 2 map дээр хичнээн barrel байдаг вэ?', null, '12', null, null, 'hard'),
  (v_maps_id, v_user_id, 'Аль map нь лорын хувьд Итали улсын жижиг тосгонд өрнөдөг вэ?', null, 'Visual Answer', 'https://static.wikia.nocookie.net/cswikia/images/1/17/Cs2_inferno_remake.png/revision/latest?cb=20260304235624', 'map', 'normal'),
  (v_maps_id, v_user_id, 'Nuke map дээр хэдэн хаалга байдаг вэ?', null, '3', null, null, 'normal'),
  (v_maps_id, v_user_id, 'Overpass map аль улс/хотод байрладаг гэж тооцогддог вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/330px-Flag_of_Germany.svg.png', 'flag', 'hard');
end $$;

-- ЧУХАЛ: regenerate_tower_floors() нь auth.uid()-аар admin эсэхийг шалгадаг тул
-- SQL Editor-оос шууд дуудаж болохгүй (auth.uid() энд null байна).
-- Скриптийг ажиллуулсны дараа аппдаа нэвтэрч, Admin Dashboard-с
-- "cs2 teams", "cs2 players", "cs2 map knowledge" ангилал тус бүрийг materialize хийнэ үү.
