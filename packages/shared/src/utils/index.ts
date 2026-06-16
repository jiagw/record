import { DEFAULT_EXERCISE_IDS, type WorkoutDayType } from '../data/exercises.js'
import { calcNutrition, getFoodById, type FoodNutrition } from '../data/foods.js'
import type { DietRecord } from '../types/diet.js'

export interface DailyNutritionSummary extends FoodNutrition {
  date: string
  label: string
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatChartDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${month}-${day}`
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

export function toDailySummary(date: string, records: DietRecord[]): DailyNutritionSummary {
  return {
    date,
    label: formatChartDate(date),
    ...calcDailyTotals(records),
  }
}

export function toWeightSummary(date: string, weight: number) {
  return {
    date,
    label: formatChartDate(date),
    weight,
  }
}

export function createDefaultDietLog(date: string) {
  return {
    date,
    records: [{ id: 1, foodId: '', amount: 100 }],
    nextId: 2,
  }
}

export function createDefaultSets(count = 4) {
  return Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    weight: 0,
    reps: 0,
  }))
}

export function createExercisesForDayType(dayType: WorkoutDayType) {
  return DEFAULT_EXERCISE_IDS[dayType].map((exerciseId, index) => ({
    id: index + 1,
    exerciseId,
    sets: createDefaultSets(),
  }))
}

export function createDefaultWorkoutLog(date: string, dayType: WorkoutDayType | '' = '') {
  const exercises = dayType ? createExercisesForDayType(dayType) : []
  return {
    date,
    dayType,
    exercises,
    nextId: exercises.length + 1,
  }
}

export function resizeSets(
  sets: { setNumber: number; weight: number; reps: number }[],
  count: number,
) {
  const nextCount = Math.max(1, Math.min(count, 20))
  return Array.from({ length: nextCount }, (_, index) => {
    const existing = sets[index]
    return {
      setNumber: index + 1,
      weight: existing?.weight ?? 0,
      reps: existing?.reps ?? 0,
    }
  })
}
