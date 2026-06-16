export type WorkoutDayType = 'push' | 'pull' | 'leg';
export interface ExerciseItem {
    id: string;
    name: string;
    dayType: WorkoutDayType;
}
export declare const WORKOUT_DAY_OPTIONS: {
    value: WorkoutDayType;
    label: string;
}[];
export declare const DEFAULT_EXERCISE_IDS: Record<WorkoutDayType, string[]>;
export declare const EXERCISES: ExerciseItem[];
export declare function getExerciseById(id: string): ExerciseItem | undefined;
export declare function getExercisesByDayType(dayType: WorkoutDayType): ExerciseItem[];
export declare function getDayTypeLabel(dayType: WorkoutDayType): string;
export declare function inferDayTypeFromExerciseId(exerciseId: string): WorkoutDayType | '';
