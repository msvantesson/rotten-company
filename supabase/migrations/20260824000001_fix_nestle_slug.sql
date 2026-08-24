-- Fix Nestlé slug: accented 'é' was stripped, leaving "nestl".
-- Correct slug is "nestle".
UPDATE companies
SET slug = 'nestle'
WHERE slug = 'nestl'
  AND name ILIKE 'nestl%';
