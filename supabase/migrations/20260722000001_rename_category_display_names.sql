-- Rename category display names to updated wording.
-- Internal slugs and PKs are intentionally unchanged to preserve
-- all existing evidence references, API contracts, and moderation workflows.
-- No schema migration, no data remap, no PK changes.

UPDATE categories SET name = 'Corporate Misconduct'
  WHERE name = 'Broken promises';

UPDATE categories SET name = 'Human Rights & Exploitation'
  WHERE name = 'Exploitation';

UPDATE categories SET name = 'Fraud & Corruption'
  WHERE name = 'Fraud';

UPDATE categories SET name = 'Deceptive Practices'
  WHERE name = 'Deceptive claims';

UPDATE categories SET name = 'Environmental Harm'
  WHERE name = 'Environmental damage';

UPDATE categories SET name = 'Sustainability Deception'
  WHERE name = 'Greenwashing';

UPDATE categories SET name = 'Workplace Misconduct'
  WHERE name = 'Fear-based management';

UPDATE categories SET name = 'Financial Misconduct'
  WHERE name = 'Private equity fallout';
