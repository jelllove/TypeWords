export type StoredValue =
  | { type: 'value'; value: string | number | boolean | null }
  | { type: 'undefined' }
  | { type: 'array'; value: StoredValue[] }
  | { type: 'object'; value: [string, StoredValue][] }
  | { type: 'date'; value: string }
  | { type: 'blob'; value: string; mime: string; name?: string; lastModified?: number }

export interface LocalDataDocument {
  version: 1
  generation: string
  revision: number
  entries: Record<string, StoredValue>
}

export type LocalDataMutation =
  | { action: 'set'; key: string; value: StoredValue; expectedRevision?: number }
  | { action: 'delete'; key: string }
  | { action: 'import'; entries: Record<string, StoredValue> }
  | { action: 'clear' }

export function isStorageKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 512 &&
    !['__proto__', 'constructor', 'prototype'].includes(key)
  )
}

export function isStoredValue(value: unknown): value is StoredValue {
  if (!value || typeof value !== 'object' || !('type' in value)) return false
  switch (value.type) {
    case 'undefined':
      return true
    case 'value':
      return (
        'value' in value &&
        (value.value === null ||
          typeof value.value === 'string' ||
          typeof value.value === 'boolean' ||
          (typeof value.value === 'number' && Number.isFinite(value.value)))
      )
    case 'date':
      return 'value' in value && typeof value.value === 'string' && Number.isFinite(Date.parse(value.value))
    case 'blob':
      return (
        'value' in value &&
        typeof value.value === 'string' &&
        value.value.length % 4 === 0 &&
        /^[A-Za-z0-9+/]*={0,2}$/.test(value.value) &&
        'mime' in value &&
        typeof value.mime === 'string' &&
        (!('name' in value) || typeof value.name === 'string') &&
        (!('lastModified' in value) || typeof value.lastModified === 'number')
      )
    case 'array':
      return 'value' in value && Array.isArray(value.value) && value.value.every(isStoredValue)
    case 'object':
      return (
        'value' in value &&
        Array.isArray(value.value) &&
        value.value.every(
          entry => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && isStoredValue(entry[1])
        )
      )
    default:
      return false
  }
}

export async function encodeStoredValue(value: unknown): Promise<StoredValue> {
  if (value === undefined) return { type: 'undefined' }
  if (value === null) return { type: 'value', value: null }
  if (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return { type: 'value', value }
  }
  if (value instanceof Blob) {
    const bytes = new Uint8Array(await value.arrayBuffer())
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
    }
    return {
      type: 'blob',
      value: btoa(binary),
      mime: value.type,
      ...(value instanceof File ? { name: value.name, lastModified: value.lastModified } : {}),
    }
  }
  if (value instanceof Date) return { type: 'date', value: value.toISOString() }
  if (Array.isArray(value)) return { type: 'array', value: await Promise.all(value.map(encodeStoredValue)) }
  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]): Promise<[string, StoredValue]> => [
        key,
        await encodeStoredValue(item),
      ])
    )
    return { type: 'object', value: entries }
  }
  throw new TypeError('Unsupported local data value')
}

export function decodeStoredValue(value: StoredValue): unknown {
  switch (value.type) {
    case 'undefined':
      return undefined
    case 'value':
      return value.value
    case 'date':
      return new Date(value.value)
    case 'array':
      return value.value.map(decodeStoredValue)
    case 'object':
      return Object.fromEntries(value.value.map(([key, item]) => [key, decodeStoredValue(item)]))
    case 'blob': {
      const bytes = Uint8Array.from(atob(value.value), char => char.charCodeAt(0))
      return value.name === undefined
        ? new Blob([bytes], { type: value.mime })
        : new File([bytes], value.name, { type: value.mime, lastModified: value.lastModified })
    }
  }
}
