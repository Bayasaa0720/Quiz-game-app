-- Гүйцэтгэлийн индексүүд — одоогийн schema-д PK/UNIQUE-аас өөр ямар ч
-- индекс байгаагүй тул (`/code-review`-ийн audit, 2026-10-02) ихэд
-- хайгддаг FK/filter баганууд дээр нэмж байна. Бүгд CONCURRENTLY биш
-- (SQL Editor нь нэг transaction дотор ажилладаг тул CONCURRENTLY
-- ашиглах боломжгүй) — жижиг/дунд хэмжээний хүснэгтэд энгийн CREATE
-- INDEX хангалттай хурдан.
--
-- Supabase Dashboard -> SQL Editor-т ажиллуулна уу. Дахин ажиллуулахад
-- аюулгүй (IF NOT EXISTS).

create index if not exists idx_battle_attempts_log_user_played
  on battle_attempts_log (user_id, played_at desc);

create index if not exists idx_duels_player1_status
  on duels (player1_id, status);

create index if not exists idx_duels_player2_status
  on duels (player2_id, status);

-- Нээлттэй (challenge биш) тоглолт хайх duel_find_match-д зориулсан
-- хэсэгчилсэн индекс.
create index if not exists idx_duels_waiting_matchmaking
  on duels (category_id)
  where status = 'waiting' and is_direct_challenge = false;

create index if not exists idx_friendships_requester
  on friendships (requester_id);

create index if not exists idx_friendships_addressee
  on friendships (addressee_id);

create index if not exists idx_quiz_items_category
  on quiz_items (category_id);

create index if not exists idx_tower_floors_category
  on tower_floors (category_id);

create index if not exists idx_tower_progress_user_category
  on tower_progress (user_id, category_id);

-- Нэг хэрэглэгч ижил нэртэй ангилал давхардуулж үүсгэхээс сэргийлнэ
-- (QuizCreator.jsx-ийн find-or-insert race-ийг DB талдаа хаадаг). Анх
-- _archive_do_not_run/migration.sql-д нэг удаа үүсгэгдсэн байсан тул
-- энд дахин тодорхойлж, одоогийн "active" migration файлуудын нэг хэсэг
-- болгож байна (archive файлыг дахин ажиллуулахгүйгээр ч энэ index
-- цаашид баталгаатай сэргээгдэх/хадгалагдах зорилготой).
create unique index if not exists categories_name_user_unique
  on categories (name, user_id);
