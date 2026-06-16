const DB_NAME = 'diet-record-db'
const DB_VERSION = 3
export const DIET_STORE = 'daily-logs'
export const WEIGHT_STORE = 'weight-logs'
export const WORKOUT_STORE = 'workout-logs'

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        dbPromise = null
        reject(request.error ?? new Error('打开 IndexedDB 失败'))
      }

      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(DIET_STORE)) {
          db.createObjectStore(DIET_STORE, { keyPath: 'date' })
        }
        if (!db.objectStoreNames.contains(WEIGHT_STORE)) {
          db.createObjectStore(WEIGHT_STORE, { keyPath: 'date' })
        }
        if (!db.objectStoreNames.contains(WORKOUT_STORE)) {
          db.createObjectStore(WORKOUT_STORE, { keyPath: 'date' })
        }
      }
    })
  }

  return dbPromise
}

export function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        const request = handler(store)

        transaction.oncomplete = () => resolve(request.result as T)
        transaction.onerror = () =>
          reject(transaction.error ?? request.error ?? new Error('IndexedDB 操作失败'))
        request.onerror = () =>
          reject(request.error ?? transaction.error ?? new Error('IndexedDB 操作失败'))
      }),
  )
}

export function batchPut<T>(storeName: string, items: T[]): Promise<void> {
  if (items.length === 0) return Promise.resolve()

  return openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)

        for (const item of items) {
          store.put(item)
        }

        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('IndexedDB 批量写入失败'))
      }),
  )
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatChartDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${month}-${day}`
}
