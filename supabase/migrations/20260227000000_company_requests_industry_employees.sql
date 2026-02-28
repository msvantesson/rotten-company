ALTER TABLE companies ADD COLUMN IF NOT EXISTS size_employees_range text;
ALTER TABLE company_requests ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE company_requests ADD COLUMN IF NOT EXISTS size_employees text;
ALTER TABLE company_requests ADD COLUMN IF NOT EXISTS size_employees_min integer;
