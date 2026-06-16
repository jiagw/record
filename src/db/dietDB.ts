import { DIET_STORE, formatDateKey, runTransaction } from './database'

export { formatDateKey } from './database'

export interface DietRecord {
  id: number
  foodId: string
  amount: number
}

export interface DailyDietLog {
  date: string
  records: DietRecord[]
  nextId: number
}

function toPlainLog(log: DailyDietLog): DailyDietLog {
  return {
    date: log.date,
    nextId: log.nextId,
    records: log.records.map((record) => ({
      id: Number(record.id),
      foodId: String(record.foodId),
      amount: Number(record.amount),
    })),
  }
}

export function createDefaultLog(date: string): DailyDietLog {
  return {
    date,
    records: [{ id: 1, foodId: '', amount: 100 }],
    nextId: 2,
  }
}

export async function loadDailyLog(date: string): Promise<DailyDietLog | null> {
  const result = await runTransaction(DIET_STORE, 'readonly', (store) => store.get(date))
  return (result as DailyDietLog | undefined) ?? null
}

export async function saveDailyLog(log: DailyDietLog): Promise<void> {
  await runTransaction(DIET_STORE, 'readwrite', (store) => store.put(toPlainLog(log)))
}

export async function deleteDailyLog(date: string): Promise<void> {
  await runTransaction(DIET_STORE, 'readwrite', (store) => store.delete(date))
}

export async function loadAllDailyLogs(): Promise<DailyDietLog[]> {
  const result = await runTransaction(DIET_STORE, 'readonly', (store) => store.getAll())
  return (result as DailyDietLog[]).sort((a, b) => a.date.localeCompare(b.date))
}
