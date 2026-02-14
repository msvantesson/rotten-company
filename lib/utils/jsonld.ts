/**
 * Shared utilities for JSON-LD structured data generation
 */

export const JSONLD_CONTEXT = "https://schema.org";
export const BASE_URL = "https://rotten-company.com";

/**
 * Creates a JSON-LD identifier URL with #identity suffix
 */
export function createIdentityUrl(entityType: string, slugOrId: string | number): string {
  return `${BASE_URL}/${entityType}/${slugOrId}#identity`;
}

/**
 * Creates a standard JSON-LD URL for an entity
 */
export function createEntityUrl(entityType: string, slug: string): string {
  return `${BASE_URL}/${entityType}/${slug}`;
}

/**
 * Creates a PropertyValue object for JSON-LD
 */
export function createPropertyValue(name: string, value: unknown) {
  return {
    "@type": "PropertyValue" as const,
    name,
    value,
  };
}
