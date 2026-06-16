import { calcNutrition, getFoodById, type FoodNutrition } from '@/data/foods'
import type { DietRecord } from '@/db/dietDB'

export interface DailyNutritionSummary extends FoodNutrition {
  date: string
  label: string
}

export function calcDailyTotals(records: DietRecord[]): FoodNutrition {
  return records.reduce(
    (sum, record) => {
      const food = getFoodById(record.foodId)
      if (!food || !record.amount) return sum
      const nutrition = calcNutrition(food, record.amount)
      return {
        protein: sum.protein + nutrition.protein,
        fat: sum.fat + nutrition.fat,
        carbs: sum.carbs + nutrition.carbs,
        calories: sum.calories + nutrition.calories,
      }
    },
    { protein: 0, fat: 0, carbs: 0, calories: 0 },
  )
}

export function formatChartDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${month}-${day}`
}

export function toDailySummary(date: string, records: DietRecord[]): DailyNutritionSummary {
  return {
    date,
    label: formatChartDate(date),
    ...calcDailyTotals(records),
  }
}
