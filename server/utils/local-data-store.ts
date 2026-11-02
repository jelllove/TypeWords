import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { isStorageKey, isStoredValue } from '../../shared/local-data.ts'
import type { LocalDataDocument, LocalDataMutation } from '../../shared/local-data.ts'

export class LocalDataConflict extends Error {}

export class LocalDataStore {
  readonly directory: string
  private queue: Promise<unknown> = Promise.resolve()

  constructor(directory: string) {
    this.directory = resolve(directory)
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation)
    this.queue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  private async read(): Promise<LocalDataDocument> {
    let raw: string
    try {
      raw = await readFile(join(this.directory, 'typewords.json'), 'utf8')
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      const document: LocalDataDocument = { version: 1, generation: randomUUID(), revision: 0, entries: {} }
      await this.write(document)
      return document
    }
    const document = JSON.parse(raw) as LocalDataDocument
    if (
      !document ||
      document.version !== 1 ||
      typeof document.generation !== 'string' ||
      !Number.isSafeInteger(document.revision) ||
      document.revision < 0 ||
      !document.entries ||
      typeof document.entries !== 'object' ||
      Array.isArray(document.entries) ||
      !Object.entries(document.entries).every(([key, value]) => isStorageKey(key) && isStoredValue(value))
    ) {
      throw new Error('Invalid local data file; restore a backup before continuing')
    }
    return document
  }

  private async write(document: LocalDataDocument): Promise<void> {
    await mkdir(this.directory, { recursive: true })
    const temporaryFile = join(this.directory, `typewords-${randomUUID()}.tmp`)
    try {
      await writeFile(temporaryFile, JSON.stringify(document, null, 2), { encoding: 'utf8', mode: 0o600, flush: true })
      await rename(temporaryFile, join(this.directory, 'typewords.json'))
    } finally {
      await rm(temporaryFile, { force: true })
    }
  }

  snapshot(generation?: string): Promise<LocalDataDocument> {
    return this.exclusive(async () => {
      const document = await this.read()
      this.checkGeneration(document, generation)
      return document
    })
  }

  private checkGeneration(document: LocalDataDocument, generation?: string) {
    if (generation !== undefined && document.generation !== generation) {
      throw new LocalDataConflict('Local data was cleared in another page. Reload before continuing.')
    }
  }

  mutate(generation: string, mutation: LocalDataMutation): Promise<LocalDataDocument> {
    return this.exclusive(async () => {
      const document = await this.read()
      this.checkGeneration(document, generation)
      if (mutation.action === 'clear') {
        document.entries = {}
        document.generation = randomUUID()
      } else if (mutation.action === 'import') {
        for (const [key, value] of Object.entries(mutation.entries)) {
          if (!isStorageKey(key) || !isStoredValue(value)) throw new TypeError('Invalid local data entry')
        }
        Object.assign(document.entries, mutation.entries)
      } else {
        if (!isStorageKey(mutation.key)) throw new TypeError('Invalid local data key')
        if (mutation.action === 'delete') {
          delete document.entries[mutation.key]
        } else {
          if (!isStoredValue(mutation.value)) throw new TypeError('Invalid local data value')
          if (mutation.expectedRevision !== undefined && mutation.expectedRevision !== document.revision) {
            throw new LocalDataConflict('Local data changed during update. Retry the operation.')
          }
          document.entries[mutation.key] = mutation.value
        }
      }
      document.revision++
      await this.write(document)
      return document
    })
  }
}
