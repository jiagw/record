import type { WorkoutDayType } from '../data/exercises.js'

export interface WorkoutSet {
  setNumber: number
  weight: number
  reps: number
}

export interface WorkoutExercise {
  id: number
  exerciseId: string
  sets: WorkoutSet[]
}

export interface DailyWorkoutLog {
  date: string
  dayType: WorkoutDayType | ''
  exercises: WorkoutExercise[]
  nextId: number
}
