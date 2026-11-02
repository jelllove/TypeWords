import { ref } from 'vue'
import Toast from '@/base/toast/Toast'
import { withAppBaseURL } from './base-url'
import { decodeStoredValue, encodeStoredValue } from '#shared/local-data'
import type { LocalDataDocument, LocalDataMutation, StoredValue } from '#shared/local-data'

type Snapshot = LocalDataDocument & { directory: string }
type EntryResponse = { generation: string; revision: number; value?: StoredValue }

export const localDataDirectory = ref('')
export const localDataError = ref('')
let generation = ''
let blocked = false
let queue: Promise<unknown> = Promise.resolve()
const strings = new Map<string, string>()

class LocalDataRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

function reportError(error: unknown) {
  localDataError.value = error instanceof Error ? error.message : String(error)
  console.error('Local file storage failed:', error)
  Toast.error(`本地文件存储失败：${localDataError.value}`)
}

async function request<T>(init?: RequestInit, key?: string): Promise<T> {
  const path = withAppBaseURL('/api/local-data') + (key === undefined ? '' : `?key=${encodeURIComponent(key)}`)
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-TypeWords-Local': '1',
      ...(generation ? { 'X-TypeWords-Generation': generation } : {}),
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new LocalDataRequestError(response.status, `${response.status}: ${body}`)
  }
  localDataError.value = ''
  return response.json() as Promise<T>
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation)
  queue = result.then(() => undefined, reportError)
  return result
}

function remember(key: string, value: unknown) {
  if (typeof value === 'string') strings.set(key, value)
  else strings.delete(key)
}

async function mutate(mutation: LocalDataMutation): Promise<void> {
  if (blocked) throw new Error('本地数据已清空，请刷新页面后继续')
  await request({ method: 'POST', body: JSON.stringify({ mutation }) })
}

export async function initializeLocalStorage(): Promise<void> {
  const snapshot = await request<Snapshot>()
  generation = snapshot.generation
  localDataDirectory.value = snapshot.directory
  strings.clear()
  for (const [key, value] of Object.entries(snapshot.entries)) remember(key, decodeStoredValue(value))
}

// Keep the existing key/value API so caches, backups and uploaded audio use the same file store.
export function get<T = any>(key: string): Promise<T | undefined> {
  return enqueue(async () => {
    const response = await request<EntryResponse>(undefined, key)
    const value = response.value === undefined ? undefined : decodeStoredValue(response.value)
    remember(key, value)
    return value as T | undefined
  })
}

export function set(key: string, value: unknown): Promise<void> {
  const encoded = encodeStoredValue(value)
  return enqueue(async () => {
    await mutate({ action: 'set', key, value: await encoded })
    remember(key, value)
  })
}

export function del(key: string): Promise<void> {
  return enqueue(async () => {
    await mutate({ action: 'delete', key })
    strings.delete(key)
  })
}

export function update<T = any>(key: string, updater: (value: T | undefined) => T): Promise<void> {
  return enqueue(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await request<EntryResponse>(undefined, key)
      const oldValue = response.value === undefined ? undefined : (decodeStoredValue(response.value) as T)
      const value = updater(oldValue)
      try {
        await mutate({ action: 'set', key, value: await encodeStoredValue(value), expectedRevision: response.revision })
        remember(key, value)
        return
      } catch (error) {
        if (!(error instanceof LocalDataRequestError && error.status === 409) || attempt === 2) throw error
      }
    }
  })
}

export function getStoredString(key: string): string | null {
  return strings.get(key) ?? null
}

export function setStoredString(key: string, value: string): void {
  remember(key, value)
  void set(key, value).catch(error => console.error('String setting was not saved:', error))
}

export function removeStoredString(key: string): void {
  strings.delete(key)
  void del(key).catch(error => console.error('String setting was not removed:', error))
}

export function clearLocalData(): Promise<void> {
  return enqueue(async () => {
    await mutate({ action: 'clear' })
    blocked = true
    strings.clear()
  })
}

export async function migrateBrowserData(): Promise<number> {
  const { entries } = await import('idb-keyval')
  const values = new Map<string, unknown>((await entries()).map(([key, value]) => [String(key), value]))
  const oldStringKeys = [
    'type-words-app-version',
    'typing-word-dict',
    'typing-word-setting',
    'PracticeSaveWord',
    'PracticeSaveArticle',
    'PracticeFlowV2',
    'supabase_config',
    'disable360',
    'tour-guide',
    'showConflictNotice',
    '__migrated_from_2study_top__',
    'tw_mini_qr_last_date',
    'tw_mini_qr_never_show',
  ]
  for (const key of oldStringKeys) {
    const value = localStorage.getItem(key)
    if (value !== null && !values.has(key)) values.set(key, value)
  }
  if (!values.size) return 0
  const encodedEntries = Object.fromEntries(
    await Promise.all([...values].map(async ([key, value]) => [key, await encodeStoredValue(value)] as const))
  )
  await enqueue(() => mutate({ action: 'import', entries: encodedEntries }))
  return values.size
}
