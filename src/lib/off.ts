// Open Food Facts client. CORS-friendly, no auth.
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/

export type OffProduct = {
  barcode: string
  name: string
  per100g: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
}

export async function fetchOffProduct(barcode: string): Promise<OffProduct | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
  )
  if (!res.ok) return null
  const json = (await res.json()) as { status?: number; product?: any }
  if (json.status !== 1 || !json.product) return null
  const n = json.product.nutriments ?? {}
  return {
    barcode,
    name: json.product.product_name || json.product.generic_name || 'Unknown product',
    per100g: {
      calories: Number(n['energy-kcal_100g'] ?? n['energy_100g'] ?? 0),
      protein_g: Number(n['proteins_100g'] ?? 0),
      carbs_g: Number(n['carbohydrates_100g'] ?? 0),
      fat_g: Number(n['fat_100g'] ?? 0)
    }
  }
}

export function scaleByGrams(per100g: OffProduct['per100g'], grams: number) {
  const f = grams / 100
  return {
    calories: round(per100g.calories * f),
    protein_g: round(per100g.protein_g * f),
    carbs_g: round(per100g.carbs_g * f),
    fat_g: round(per100g.fat_g * f)
  }
}

const round = (n: number) => Math.round(n * 10) / 10
