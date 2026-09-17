-- Add a column to store AI-generated decoy (wrong) answers per question.
--
-- Why: decoy options were only ever pulled from other questions' answers
-- in the same category+answer_type pool — quality depends entirely on
-- what else happens to exist there. Storing up to 9 AI-generated,
-- topically relevant decoys directly on each text-answer question
-- (generated once at creation time via /api/generate-decoys, not at
-- battle time) gives consistently better decoys without depending on
-- pool size. Battle.jsx randomly picks 3 of the stored decoys on each
-- play, so replaying the same question doesn't always show the same
-- three wrong options.
--
-- Run this once in the Supabase SQL Editor.

ALTER TABLE quiz_items ADD COLUMN IF NOT EXISTS decoys jsonb;

COMMENT ON COLUMN quiz_items.decoys IS
  'AI-generated wrong-answer options for this question (array of up to 9 strings; Battle.jsx picks 3 at random per play). NULL for older rows and image answers — Battle.jsx falls back to the category/answer_type pool when this is absent or has fewer than 3 entries.';
