import * as XLSX from 'xlsx'
import { formatDateKey, type WeightLog } from '@/db/weightDB'

export function exportWeightToExcel(logs: WeightLog[]): void {
  const rows = logs.map((log) => ({
    日期: log.date,
    '体重(kg)': log.weight,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [{ wch: 14 }, { wch: 12 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '体重记录')
  XLSX.writeFile(workbook, `体重记录_${formatDateKey(new Date())}.xlsx`)
}
