export type BodyType = 'endomorph' | 'ectomorph'
export type ProteinFactor = 0.8 | 1.0 | 1.2 | 1.5

export interface DayPlan {
  carbs: number
  fat: number
  protein: number
  calories: number
}

export interface CarbCycleResult {
  high: DayPlan
  medium: DayPlan
  low: DayPlan
  weeklyAvgCalories: number
  weeklyCarbsTotal: number
  weeklyFatTotal: number
  dailyProtein: number
}

function round(n: number) {
  return Math.round(n)
}

function calcCalories(carbs: number, protein: number, fat: number) {
  return round(carbs * 4 + protein * 4 + fat * 9)
}

export function calcCarbCycle(
  weightKg: number,
  bodyType: BodyType,
  proteinFactor: ProteinFactor,
): CarbCycleResult {
  let dailyCarbs: number
  let dailyFat: number

  if (bodyType === 'endomorph') {
    dailyCarbs = weightKg * 2
    dailyFat = weightKg * 0.8
  } else {
    dailyCarbs = weightKg * 3
    dailyFat = weightKg * (proteinFactor === 1.2 ? 1.2 : 1.0)
  }

  const dailyProtein = weightKg * proteinFactor
  const weeklyCarbs = dailyCarbs * 7
  const weeklyFat = dailyFat * 7

  const highCarbs = round((weeklyCarbs * 0.5) / 2)
  const highFat = round((weeklyFat * 0.15) / 2)
  const mediumCarbs = round((weeklyCarbs * 0.35) / 3)
  const mediumFat = round((weeklyFat * 0.35) / 3)
  const lowCarbs = round((weeklyCarbs * 0.15) / 2)
  const lowFat = round((weeklyFat * 0.5) / 2)

  const protein = round(dailyProtein)

  const high: DayPlan = {
    carbs: highCarbs,
    fat: highFat,
    protein,
    calories: calcCalories(highCarbs, protein, highFat),
  }
  const medium: DayPlan = {
    carbs: mediumCarbs,
    fat: mediumFat,
    protein,
    calories: calcCalories(mediumCarbs, protein, mediumFat),
  }
  const low: DayPlan = {
    carbs: lowCarbs,
    fat: lowFat,
    protein,
    calories: calcCalories(lowCarbs, protein, lowFat),
  }

  const weeklyAvgCalories = round((high.calories * 2 + medium.calories * 3 + low.calories * 2) / 7)

  return {
    high,
    medium,
    low,
    weeklyAvgCalories,
    weeklyCarbsTotal: round(weeklyCarbs),
    weeklyFatTotal: round(weeklyFat),
    dailyProtein: protein,
  }
}

export function buildCopyText(weightKg: number, result: CarbCycleResult, showCalories: boolean) {
  const lines = [
    `碳循环方案（体重 ${round(weightKg)} kg）`,
    '',
    `高碳日（2天）：碳水 ${result.high.carbs}g，脂肪 ${result.high.fat}g，蛋白 ${result.high.protein}g${
      showCalories ? `，热量 ${result.high.calories} kcal` : ''
    }`,
    `中碳日（3天）：碳水 ${result.medium.carbs}g，脂肪 ${result.medium.fat}g，蛋白 ${result.medium.protein}g${
      showCalories ? `，热量 ${result.medium.calories} kcal` : ''
    }`,
    `低碳日（2天）：碳水 ${result.low.carbs}g，脂肪 ${result.low.fat}g，蛋白 ${result.low.protein}g${
      showCalories ? `，热量 ${result.low.calories} kcal` : ''
    }`,
    '',
    showCalories ? `周平均热量：${result.weeklyAvgCalories} kcal` : '',
    `周碳水总量：${result.weeklyCarbsTotal} g`,
    `周脂肪总量：${result.weeklyFatTotal} g`,
  ].filter(Boolean)

  return lines.join('\n')
}
