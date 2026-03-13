/**
 * Returns true if the given company name represents a test entity.
 * Test companies are identified by the presence of "(Test)" (case-insensitive)
 * anywhere in the name, e.g. "Acme Corp (Test)".
 */
export function isTestCompany(name: string): boolean {
  return /\(test\)/i.test(name);
}
