-- Update category display names to match new wording.
-- Internal slugs and IDs are intentionally unchanged to preserve
-- existing data, API contracts, and moderation workflows.

UPDATE categories SET name = 'Deceptive claims'
  WHERE name = 'False claims';

UPDATE categories SET name = 'Fear-based management'
  WHERE name = 'Management by fear';

-- Match both title-case variants seen in code comments and DB seed to be safe.
UPDATE categories SET name = 'Private equity fallout'
  WHERE name IN ('Private Equity Fallout', 'Private Equity fallout');
