export const CATEGORY_FLAVORS: Record<number, string> = {
  1: "Rotten to the core",
  2: "Smells like spin",
  3: "Boardroom smoke and mirrors",
  4: "Toxic workplace vibes",
  5: "Ethics on life support",
  6: "Greenwashing deluxe",
  13: "Customer trust? Never heard of it",

export function getFlavor(categoryId: number): string {
  return CATEGORY_FLAVORS[categoryId] ?? "No flavor assigned";
}

  
};
