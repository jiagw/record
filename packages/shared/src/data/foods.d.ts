export type FoodUnit = 'g' | 'piece';
export interface FoodNutrition {
    protein: number;
    fat: number;
    carbs: number;
    calories: number;
}
export interface FoodItem {
    id: string;
    name: string;
    unit: FoodUnit;
    weightPerPiece?: number;
    per100g: FoodNutrition;
}
export declare const FOODS: FoodItem[];
export declare function getFoodById(id: string): FoodItem | undefined;
export declare function getFoodUnitLabel(food: FoodItem): string;
export declare function calcGrams(food: FoodItem, amount: number): number;
export declare function calcNutrition(food: FoodItem, amount: number): FoodNutrition;
export declare function formatNumber(value: number, digits?: number): string;
