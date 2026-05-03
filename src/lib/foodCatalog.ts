export type Per100g = { calories: number; protein_g: number; carbs_g: number; fat_g: number }

export type CatalogEntry = {
  name: string
  per100g: Per100g
  savedAt: number
}

const KEY = 'food_catalog_v1'

function read(): Record<string, CatalogEntry> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}

export function saveToCatalog(name: string, per100g: Per100g) {
  const catalog = read()
  catalog[name.toLowerCase()] = { name, per100g, savedAt: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(catalog))
}

export function getFromCatalog(name: string): CatalogEntry | null {
  return read()[name.toLowerCase()] ?? null
}
