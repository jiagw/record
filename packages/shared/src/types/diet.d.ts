export interface DietRecord {
    id: number;
    foodId: string;
    amount: number;
}
export interface DailyDietLog {
    date: string;
    records: DietRecord[];
    nextId: number;
}
