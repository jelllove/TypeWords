import { LocalDataConflict, LocalDataStore } from '../utils/local-data-store'
import { isStorageKey } from '../../shared/local-data'
import type { LocalDataMutation } from '../../shared/local-data'

let store: LocalDataStore | undefined

export default defineEventHandler(async event => {
  const url = getRequestURL(event)
  const origin = getHeader(event, 'origin')
  const address = getRequestIP(event)
  // Nitro's dev worker has no peer socket; the dev listener is bound to loopback.
  const isLocalAddress =
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? '') || (import.meta.dev && address === undefined)
  if (
    !isLocalAddress ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    getHeader(event, 'x-typewords-local') !== '1' ||
    (origin && origin !== url.origin)
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Local data is only accessible from this computer' })
  }
  setHeader(event, 'Cache-Control', 'no-store')
  if (!['GET', 'POST'].includes(event.method)) {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }
  const config = useRuntimeConfig(event)
  store ??= new LocalDataStore(config.localDataDir)
  try {
    const generation = getHeader(event, 'x-typewords-generation')
    if (event.method === 'GET') {
      const document = await store.snapshot(generation)
      const query = getQuery(event)
      if (query.status === '1') {
        return { app: 'typewords-local', status: 'ready', directory: store.directory }
      }
      const key = query.key
      if (key !== undefined) {
        if (!isStorageKey(key)) throw new TypeError('Invalid local data key')
        return { generation: document.generation, revision: document.revision, value: document.entries[key] }
      }
      return { ...document, directory: store.directory }
    }
    if (!generation) throw new TypeError('Missing local data generation')
    const body = await readBody<{ mutation?: LocalDataMutation }>(event)
    const mutation = body?.mutation
    if (
      !mutation ||
      !['set', 'delete', 'import', 'clear'].includes(mutation.action) ||
      (mutation.action === 'import' &&
        (!mutation.entries || typeof mutation.entries !== 'object' || Array.isArray(mutation.entries)))
    ) {
      throw new TypeError('Invalid local data operation')
    }
    const document = await store.mutate(generation, mutation)
    return { generation: document.generation, revision: document.revision }
  } catch (error) {
    if (error instanceof LocalDataConflict) {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    if (error instanceof TypeError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    console.error('Local data operation failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Cannot access the local data file. Check the server logs and folder permissions.',
    })
  }
})
