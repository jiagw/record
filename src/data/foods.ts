export type FoodUnit = 'g' | 'piece'

export interface FoodNutrition {
  protein: number
  fat: number
  carbs: number
  calories: number
}

export interface FoodItem {
  id: string
  name: string
  unit: FoodUnit
  /** 按「个」计量时，每个约多少克 */
  weightPerPiece?: number
  /** 每 100g 的营养素含量 */
  per100g: FoodNutrition
}

export const FOODS: FoodItem[] = [
  {
    id: 'chicken',
    name: '鸡胸肉',
    unit: 'g',
    per100g: { protein: 23.3, fat: 1.2, carbs: 0, calories: 118 },
  },
  {
    id: 'beef',
    name: '牛肉',
    unit: 'g',
    per100g: { protein: 20.2, fat: 10.8, carbs: 0, calories: 250 },
  },
  {
    id: 'shrimp',
    name: '大虾',
    unit: 'g',
    per100g: { protein: 20.6, fat: 0.6, carbs: 0, calories: 93 },
  },
  {
    id: 'rice',
    name: '大米（生）',
    unit: 'g',
    per100g: { protein: 12.7, fat: 0.9, carbs: 75, calories: 346 },
  },
  {
    id: 'potato',
    name: '土豆',
    unit: 'g',
    per100g: { protein: 2.0, fat: 0.1, carbs: 17.2, calories: 77 },
  },
  {
    id: 'corn',
    name: '玉米',
    unit: 'piece',
    weightPerPiece: 100,
    per100g: { protein: 4.2, fat: 0.4, carbs: 21.3, calories: 100 },
  },
  {
    id: 'egg',
    name: '鸡蛋',
    unit: 'piece',
    weightPerPiece: 50,
    per100g: { protein: 13.3, fat: 8.8, carbs: 2.8, calories: 144 },
  },
  {
    id: 'avocado',
    name: '牛油果',
    unit: 'piece',
    weightPerPiece: 100,
    per100g: { protein: 2, fat: 20, carbs: 0, calories: 188 },
  },
  {
    id: 'broccoli',
    name: '西兰花',
    unit: 'g',
    per100g: { protein: 4.1, fat: 0.6, carbs: 4.3, calories: 34 },
  },
  {
    id: 'nuts',
    name: '坚果',
    unit: 'g',
    per100g: { protein: 16.7, fat: 50.2, carbs: 13.6, calories: 651 },
  },

]

export function getFoodById(id: string): FoodItem | undefined {
  return FOODS.find((food) => food.id === id)
}

export function getFoodUnitLabel(food: FoodItem): string {
  return food.unit === 'g' ? 'g' : '个'
}

export function calcGrams(food: FoodItem, amount: number): number {
  if (food.unit === 'g') return amount
  return amount * (food.weightPerPiece ?? 0)
}

export function calcNutrition(food: FoodItem, amount: number): FoodNutrition {
  const grams = calcGrams(food, amount)
  const ratio = grams / 100

  return {
    protein: food.per100g.protein * ratio,
    fat: food.per100g.fat * ratio,
    carbs: food.per100g.carbs * ratio,
    calories: food.per100g.calories * ratio,
  }
}

export function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits)
}
