import type { DailyDietLog } from '@record/shared'
import { request } from './request'

export async function loadDailyLog(date: string): Promise<DailyDietLog | null> {
  return request<DailyDietLog | null>({ url: `/api/diet/${date}` })
}

export async function saveDailyLog(log: DailyDietLog): Promise<void> {
  await request({
    url: `/api/diet/${log.date}`,
    method: 'PUT',
    data: { records: log.records, nextId: log.nextId },
  })
}

export async function loadAllDailyLogs(): Promise<DailyDietLog[]> {
  return request<DailyDietLog[]>({ url: '/api/diet' })
}

export { createDefaultDietLog as createDefaultLog } from '@record/shared'
