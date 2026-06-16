import { WEIGHT_STORE, batchPut, formatChartDate, formatDateKey, runTransaction } from './database'

export { formatDateKey } from './database'

export interface WeightLog {
  date: string
  weight: number
}

export interface WeightSummary {
  date: string
  label: string
  weight: number
}

function toPlainLog(log: WeightLog): WeightLog {
  return {
    date: log.date,
    weight: Number(log.weight),
  }
}

export function toWeightSummary(log: WeightLog): WeightSummary {
  return {
    date: log.date,
    label: formatChartDate(log.date),
    weight: log.weight,
  }
}

export async function loadWeightLog(date: string): Promise<WeightLog | null> {
  const result = await runTransaction(WEIGHT_STORE, 'readonly', (store) => store.get(date))
  return (result as WeightLog | undefined) ?? null
}

export async function saveWeightLog(log: WeightLog): Promise<void> {
  await runTransaction(WEIGHT_STORE, 'readwrite', (store) => store.put(toPlainLog(log)))
}

export async function deleteWeightLog(date: string): Promise<void> {
  await runTransaction(WEIGHT_STORE, 'readwrite', (store) => store.delete(date))
}

export async function loadAllWeightLogs(): Promise<WeightLog[]> {
  const result = await runTransaction(WEIGHT_STORE, 'readonly', (store) => store.getAll())
  return (result as WeightLog[]).sort((a, b) => a.date.localeCompare(b.date))
}

export async function importWeightLogs(logs: WeightLog[]): Promise<void> {
  await batchPut(
    WEIGHT_STORE,
    logs.map((log) => toPlainLog(log)),
  )
}
