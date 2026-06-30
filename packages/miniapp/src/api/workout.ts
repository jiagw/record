import type { DailyWorkoutLog } from '@record/shared'
import {
  createDefaultSets,
  createDefaultWorkoutLog,
  createExercisesForDayType,
  resizeSets,
} from '@record/shared'
import { request } from './request'

export type { DailyWorkoutLog, WorkoutExercise, WorkoutSet } from '@record/shared'

export {
  createDefaultSets,
  createExercisesForDayType,
  createDefaultWorkoutLog as createDefaultLog,
  resizeSets,
}

export async function loadWorkoutLog(date: string): Promise<DailyWorkoutLog | null> {
  return request<DailyWorkoutLog | null>({ url: `/api/workout/${date}` })
}

export async function loadLastWorkoutByDayType(
  dayType: DailyWorkoutLog['dayType'],
  before: string,
): Promise<DailyWorkoutLog | null> {
  if (!dayType) return null
  return request<DailyWorkoutLog | null>({
    url: `/api/workout/last?dayType=${dayType}&before=${before}`,
  })
}

export async function saveWorkoutLog(log: DailyWorkoutLog): Promise<void> {
  await request({
    url: `/api/workout/${log.date}`,
    method: 'PUT',
    data: {
      dayType: log.dayType,
      exercises: log.exercises,
      nextId: log.nextId,
    },
  })
}
