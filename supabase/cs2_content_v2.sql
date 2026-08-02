-- CS2 агуулгын 2-р багц: давхар бүрийг 5 асуулттай болгохын тулд
-- cs2 teams/players/map knowledge ангилал тус бүрийн хялбар/дунд/хэцүү
-- зэрэг бүрд асуулт нэмнэ.
-- ЭХЛЭЭД floor_batch_size.sql-ийг ажиллуулсан байх ёстой.
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу.

do $$
declare
  v_user_id uuid := '6c31c337-08ad-4694-aa7b-33d31ca50b88';
  v_teams_id uuid;
  v_players_id uuid;
  v_maps_id uuid;
begin
  select id into v_teams_id from categories where name = 'cs2 teams' and user_id = v_user_id;
  select id into v_players_id from categories where name = 'cs2 players' and user_id = v_user_id;
  select id into v_maps_id from categories where name = 'cs2 map knowledge' and user_id = v_user_id;

  -- === cs2 teams (+8) ===
  insert into quiz_items (category_id, user_id, quiz_question, question_image_url, correct_answer, answer_image_url, answer_type, difficulty) values
  (v_teams_id, v_user_id, 'MOUZ (mousesports) аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/330px-Flag_of_Germany.svg.png', 'flag', 'easy'),
  (v_teams_id, v_user_id, 'Team Liquid аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Flag_of_the_Netherlands.svg/330px-Flag_of_the_Netherlands.svg.png', 'flag', 'easy'),
  (v_teams_id, v_user_id, 'BIG (Berlin International Gaming) аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/330px-Flag_of_Germany.svg.png', 'flag', 'easy'),
  (v_teams_id, v_user_id, 'ENCE аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Flag_of_Finland.svg/330px-Flag_of_Finland.svg.png', 'flag', 'normal'),
  (v_teams_id, v_user_id, 'G2 Esports хэдэн онд байгуулагдсан бэ?', null, '2014', null, null, 'normal'),
  (v_teams_id, v_user_id, 'NAVI хэдэн онд байгуулагдсан бэ?', null, '2009', null, null, 'hard'),
  (v_teams_id, v_user_id, 'Astralis хэдэн онд байгуулагдсан бэ?', null, '2016', null, null, 'hard'),
  (v_teams_id, v_user_id, 'FaZe Clan хэдэн онд байгуулагдсан бэ?', null, '2010', null, null, 'hard');

  -- === cs2 players (+8) ===
  insert into quiz_items (category_id, user_id, quiz_question, question_image_url, correct_answer, answer_image_url, answer_type, difficulty) values
  (v_players_id, v_user_id, 'Twistzz (Russel Van Dulken) аль улсаас гаралтай вэ?', null, 'Visual Answer', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Flag_of_Canada_%28Pantone%29.svg/330px-Flag_of_Canada_%28Pantone%29.svg.png', 'flag', 'easy'),
  (v_players_id, v_user_id, 'device-ийн жинхэнэ нэр хэн бэ?', null, 'Nicolai Reedtz', null, null, 'easy'),
  (v_players_id, v_user_id, 'broky (Helvijs Saukants) аль улсаас гаралтай вэ?', null, 'Латви', null, null, 'normal'),
  (v_players_id, v_user_id, 'sh1ro (Dmitry Sokolov) аль улсаас гаралтай вэ?', null, 'Орос', null, null, 'normal'),
  (v_players_id, v_user_id, 'karrigan (Finn Andersen)-ий үндэсний харьяалал аль вэ?', null, 'Дани', null, null, 'normal'),
  (v_players_id, v_user_id, 'ZywOo-гийн жинхэнэ нэр хэн бэ?', null, 'Mathieu Herbaut', null, null, 'hard'),
  (v_players_id, v_user_id, '2018 оны FACEIT Major London-ийн MVP хэн байсан бэ?', null, 'dev1ce', null, null, 'hard'),
  (v_players_id, v_user_id, 'device (Nicolai Reedtz) аль улсаас гаралтай вэ?', null, 'Дани', null, null, 'hard');

  -- === cs2 map knowledge (+10) ===
  insert into quiz_items (category_id, user_id, quiz_question, question_image_url, correct_answer, answer_image_url, answer_type, difficulty) values
  (v_maps_id, v_user_id, 'Ихэнх CS2 map дээр ерөнхийдөө хэдэн bomb site байдаг вэ?', null, '2 (A, B)', null, null, 'easy'),
  (v_maps_id, v_user_id, 'Ancient map ямар соёл иргэншлийн чулуун байгууламжинд тулгуурлаж бүтээгдсэн бэ?', null, 'Майя', null, null, 'easy'),
  (v_maps_id, v_user_id, 'Anubis map ямар улсын сэдэвтэй вэ?', null, 'Египет', null, null, 'easy'),
  (v_maps_id, v_user_id, 'Vertigo map хаана өрнөдөг вэ?', null, 'Өндөр барилгын дээд давхарт', null, null, 'easy'),
  (v_maps_id, v_user_id, '"Retake" гэдэг тактик юуг илэрхийлдэг вэ?', null, 'Bomb тавьсны дараа site-ийг буцаан эзлэх оролдлого', null, null, 'easy'),
  (v_maps_id, v_user_id, 'Ancient map хэдэн онд CS:GO-д нэмэгдсэн бэ?', null, '2021', null, null, 'normal'),
  (v_maps_id, v_user_id, 'Inferno дээрх "Banana" гэж нэрлэгддэг байршил аль site рүү холбогддог вэ?', null, 'B site', null, null, 'normal'),
  (v_maps_id, v_user_id, 'Mirage дээрх "Connector" гэж нэрлэгддэг байршил аль хоёр site-ийг холбодог вэ?', null, 'A ба B site хоорондын дундын зам', null, null, 'normal'),
  (v_maps_id, v_user_id, 'CS2 Source 2 engine дээр утаан бөмбөг ямар шинэ технологитой болсон бэ?', null, 'Dynamic/volumetric 3D утаа', null, null, 'hard'),
  (v_maps_id, v_user_id, 'Vertigo map-д "Ramp room" гэдэг байршил аль site-тай холбоотой вэ?', null, 'B site', null, null, 'hard');
end $$;
