-- Phase A: seed SessionType from the current SESSION_TYPE_META constant
-- (src/types/index.ts). Idempotent — existing keys are left untouched.
INSERT INTO "SessionType" (key, label, color, behavior, "order", active) VALUES
  ('wod',        'WOD',          '#3cffa0', 'rounds', 0, true),
  ('strength',   'Strength',     '#c084fc', 'sets',   1, true),
  ('weightlift', 'Weight Lift',  '#5cb8ff', 'sets',   2, true),
  ('zone',       'Zone',         '#ff9055', 'rounds', 3, true),
  ('run',        'Run',          '#e8ff3c', 'text',   4, true),
  ('accessory',  'Accessories',  '#f87171', 'sets',   5, true),
  ('swim',       'Swim',         '#22d3ee', 'text',   7, true),
  ('other',      'Other',        '#94a3b8', 'text',   8, true)
ON CONFLICT (key) DO NOTHING;
