import { type WorkoutDayType } from '../data/exercises.js';
import { type FoodNutrition } from '../data/foods.js';
import type { DietRecord } from '../types/diet.js';
export interface DailyNutritionSummary extends FoodNutrition {
    date: string;
    label: string;
}
export declare function formatDateKey(date: Date): string;
export declare function formatChartDate(date: string): string;
export declare function calcDailyTotals(records: DietRecord[]): FoodNutrition;
export declare function toDailySummary(date: string, records: DietRecord[]): DailyNutritionSummary;
export declare function toWeightSummary(date: string, weight: number): {
    date: string;
    label: string;
    weight: number;
};
export declare function createDefaultDietLog(date: string): {
    date: string;
    records: {
        id: number;
        foodId: string;
        amount: number;
    }[];
    nextId: number;
};
export declare function createDefaultSets(count?: number): {
    setNumber: number;
    weight: number;
    reps: number;
}[];
export declare function createExercisesForDayType(dayType: WorkoutDayType): {
    id: number;
    exerciseId: string;
    sets: {
        setNumber: number;
        weight: number;
        reps: number;
    }[];
}[];
export declare function createDefaultWorkoutLog(date: string, dayType?: WorkoutDayType | ''): {
    date: string;
    dayType: "" | WorkoutDayType;
    exercises: {
        id: number;
        exerciseId: string;
        sets: {
            setNumber: number;
            weight: number;
            reps: number;
        }[];
    }[];
    nextId: number;
};
export declare function resizeSets(sets: {
    setNumber: number;
    weight: number;
    reps: number;
}[], count: number): {
    setNumber: number;
    weight: number;
    reps: number;
}[];
