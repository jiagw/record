import { DEFAULT_EXERCISE_IDS } from '../data/exercises.js';
import { calcNutrition, getFoodById } from '../data/foods.js';
export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
export function formatChartDate(date) {
    const [, month, day] = date.split('-');
    return `${month}-${day}`;
}
export function calcDailyTotals(records) {
    return records.reduce((sum, record) => {
        const food = getFoodById(record.foodId);
        if (!food || !record.amount)
            return sum;
        const nutrition = calcNutrition(food, record.amount);
        return {
            protein: sum.protein + nutrition.protein,
            fat: sum.fat + nutrition.fat,
            carbs: sum.carbs + nutrition.carbs,
            calories: sum.calories + nutrition.calories,
        };
    }, { protein: 0, fat: 0, carbs: 0, calories: 0 });
}
export function toDailySummary(date, records) {
    return {
        date,
        label: formatChartDate(date),
        ...calcDailyTotals(records),
    };
}
export function toWeightSummary(date, weight) {
    return {
        date,
        label: formatChartDate(date),
        weight,
    };
}
export function createDefaultDietLog(date) {
    return {
        date,
        records: [{ id: 1, foodId: '', amount: 100 }],
        nextId: 2,
    };
}
export function createDefaultSets(count = 4) {
    return Array.from({ length: count }, (_, index) => ({
        setNumber: index + 1,
        weight: 0,
        reps: 0,
    }));
}
export function createExercisesForDayType(dayType) {
    return DEFAULT_EXERCISE_IDS[dayType].map((exerciseId, index) => ({
        id: index + 1,
        exerciseId,
        sets: createDefaultSets(),
    }));
}
export function createDefaultWorkoutLog(date, dayType = '') {
    const exercises = dayType ? createExercisesForDayType(dayType) : [];
    return {
        date,
        dayType,
        exercises,
        nextId: exercises.length + 1,
    };
}
export function resizeSets(sets, count) {
    const nextCount = Math.max(1, Math.min(count, 20));
    return Array.from({ length: nextCount }, (_, index) => {
        const existing = sets[index];
        return {
            setNumber: index + 1,
            weight: existing?.weight ?? 0,
            reps: existing?.reps ?? 0,
        };
    });
}
