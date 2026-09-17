-- Backfill answer_type for existing text-answer quiz_items rows.
--
-- Why: answer_type used to be settable only for image answers (see
-- QuizCreator.jsx / QuestionManager.jsx before this change), so every
-- text-answer question had answer_type = NULL. Battle.jsx groups decoy
-- options by answer_type, treating NULL as one single group — meaning
-- ALL text answers across a whole category (CS2 tactics, site names,
-- countries, player names, etc.) were eligible as decoys for each other,
-- regardless of topic. This tags the 24 existing NULL text-answer rows
-- (as of 2026-09-17) with a topic-appropriate type so decoys only mix
-- within the same kind of answer going forward.
--
-- Run this once in the Supabase SQL Editor. Safe to re-run (each UPDATE
-- is scoped by id, idempotent).

-- cs2 teams
UPDATE quiz_items SET answer_type = 'team'       WHERE id = 'e651c055-8821-41d1-9f07-315b36f82bb0'; -- Astralis (most Majors)
UPDATE quiz_items SET answer_type = 'tournament' WHERE id = 'a830846f-006f-4d51-b848-2e5f2ce516ce'; -- DreamHack Winter 2013
UPDATE quiz_items SET answer_type = 'country'    WHERE id = '278e0601-a7dd-4d02-9b75-c5d24d8c0a27'; -- Team Spirit -> Орос
UPDATE quiz_items SET answer_type = 'animal'     WHERE id = '5f74a957-5e41-41a4-8ff9-6b48efaf52fa'; -- G2 logo -> Баавгай

-- cs2 map knowledge
UPDATE quiz_items SET answer_type = 'site'         WHERE id = 'a1110164-8440-4d95-ae07-b3eb4aae01b4'; -- Vertigo Ramp room -> B site
UPDATE quiz_items SET answer_type = 'count'        WHERE id = 'c57a9aee-d323-4946-95db-98e929fe5cca'; -- Mirage spawn count -> 5
UPDATE quiz_items SET answer_type = 'count'        WHERE id = '4b60bd89-0dae-4870-b05b-f57574e3a3a2'; -- Dust2 barrel count -> 12
UPDATE quiz_items SET answer_type = 'country'      WHERE id = '5a3e7fb5-eb6b-49a5-bd3e-28bac39c28d8'; -- Anubis -> Египет
UPDATE quiz_items SET answer_type = 'tactic'       WHERE id = '384ff548-6c73-44a9-9a10-cfb35d0a39c5'; -- Retake definition
UPDATE quiz_items SET answer_type = 'count'        WHERE id = 'cf9c3adc-c3e5-499c-a26c-53aad6b0b215'; -- bomb site count -> 2 (A, B)
UPDATE quiz_items SET answer_type = 'civilization' WHERE id = '3fe8aca7-9a19-4a60-9a9b-a13812c84048'; -- Ancient map -> Майя
UPDATE quiz_items SET answer_type = 'site'         WHERE id = '04dec1c5-350c-470d-abd1-06705d7bbdb4'; -- Inferno Banana -> B site
UPDATE quiz_items SET answer_type = 'site'         WHERE id = '2886274b-a332-40b0-9b75-94f56e859ef7'; -- Mirage Connector -> A/B site path

-- cs2 players
UPDATE quiz_items SET answer_type = 'country'   WHERE id = 'a7ba1a0c-bda6-45ad-ab46-440a6bd424a7'; -- device -> Дани
UPDATE quiz_items SET answer_type = 'player'    WHERE id = '82bfb993-9c7d-4cca-8e81-caed1820818b'; -- 2018 MVP -> dev1ce
UPDATE quiz_items SET answer_type = 'real_name' WHERE id = '902817cb-b2c2-4f07-bf6c-394084561c4c'; -- s1mple real name
UPDATE quiz_items SET answer_type = 'player'    WHERE id = '3c8a7ae4-66dd-4be4-b45f-f31d4fb74b4a'; -- 2021 MVP -> ZywOo
UPDATE quiz_items SET answer_type = 'country'   WHERE id = '187ed778-9551-45d3-915f-391d2a198e78'; -- donk -> Орос
UPDATE quiz_items SET answer_type = 'real_name' WHERE id = '32ef90e9-1c12-4b99-82d2-226de47d0e9c'; -- NiKo real name
UPDATE quiz_items SET answer_type = 'country'   WHERE id = '3cd1f79b-a37b-462c-bb7c-0a8a2e868b12'; -- karrigan -> Дани
UPDATE quiz_items SET answer_type = 'real_name' WHERE id = '674d5b05-d958-4bdb-928f-85b051d158fc'; -- ZywOo real name
UPDATE quiz_items SET answer_type = 'real_name' WHERE id = '24fd4b34-b306-49f1-81e2-f86689f26935'; -- device real name
UPDATE quiz_items SET answer_type = 'country'   WHERE id = '82a98aaf-39c0-49c6-9887-7b5cc6b09580'; -- broky -> Латви
UPDATE quiz_items SET answer_type = 'country'   WHERE id = '1ccf5875-91e9-47bc-8a06-577f656abbd3'; -- sh1ro -> Орос
