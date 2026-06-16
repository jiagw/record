import type { WorkoutDayType } from '@/data/exercises'
import { DEFAULT_EXERCISE_IDS } from '@/data/exercises'
import { WORKOUT_STORE, formatDateKey, runTransaction } from './database'

export { formatDateKey } from './database'

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

function toPlainLog(log: DailyWorkoutLog): DailyWorkoutLog {
  return {
    date: log.date,
    dayType: log.dayType,
    nextId: Number(log.nextId),
    exercises: log.exercises.map((exercise) => ({
      id: Number(exercise.id),
      exerciseId: String(exercise.exerciseId),
      sets: exercise.sets.map((set) => ({
        setNumber: Number(set.setNumber),
        weight: Number(set.weight),
        reps: Number(set.reps),
      })),
    })),
  }
}

export function createDefaultSets(count = 4): WorkoutSet[] {
  return Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    weight: 0,
    reps: 0,
  }))
}

export function createExercisesForDayType(dayType: WorkoutDayType): WorkoutExercise[] {
  return DEFAULT_EXERCISE_IDS[dayType].map((exerciseId, index) => ({
    id: index + 1,
    exerciseId,
    sets: createDefaultSets(),
  }))
}

export function createDefaultLog(date: string, dayType: WorkoutDayType | '' = ''): DailyWorkoutLog {
  const exercises = dayType ? createExercisesForDayType(dayType) : []
  return {
    date,
    dayType,
    exercises,
    nextId: exercises.length + 1,
  }
}

export function resizeSets(sets: WorkoutSet[], count: number): WorkoutSet[] {
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

export async function loadWorkoutLog(date: string): Promise<DailyWorkoutLog | null> {
  const result = await runTransaction(WORKOUT_STORE, 'readonly', (store) => store.get(date))
  return (result as DailyWorkoutLog | undefined) ?? null
}

export async function saveWorkoutLog(log: DailyWorkoutLog): Promise<void> {
  await runTransaction(WORKOUT_STORE, 'readwrite', (store) => store.put(toPlainLog(log)))
}

export async function loadAllWorkoutLogs(): Promise<DailyWorkoutLog[]> {
  const result = await runTransaction(WORKOUT_STORE, 'readonly', (store) => store.getAll())
  return (result as DailyWorkoutLog[]).sort((a, b) => a.date.localeCompare(b.date))
}
