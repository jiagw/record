import type { WeightLog } from '@record/shared'
import { formatChartDate } from '@record/shared'
import { request } from './request'

export type { WeightLog }

export interface WeightSummary {
  date: string
  label: string
  weight: number
}

export function toWeightSummary(log: WeightLog): WeightSummary {
  return {
    date: log.date,
    label: formatChartDate(log.date),
    weight: log.weight,
  }
}

export async function loadWeightLog(date: string): Promise<WeightLog | null> {
  return request<WeightLog | null>({ url: `/api/weight/${date}` })
}

export async function saveWeightLog(log: WeightLog): Promise<void> {
  await request({
    url: `/api/weight/${log.date}`,
    method: 'PUT',
    data: { weight: log.weight },
  })
}

export async function loadAllWeightLogs(): Promise<WeightLog[]> {
  return request<WeightLog[]>({ url: '/api/weight' })
}

export async function importWeightLogs(logs: WeightLog[]): Promise<void> {
  await request({
    url: '/api/weight/batch',
    method: 'POST',
    data: { logs },
  })
}
