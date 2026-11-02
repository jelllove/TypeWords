import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { decodeStoredValue, encodeStoredValue, isStoredValue } from '../shared/local-data.ts'
import { LocalDataConflict, LocalDataStore } from '../server/utils/local-data-store.ts'

async function fixture(t: { after: (cleanup: () => Promise<void>) => void }) {
  const directory = await mkdtemp(join(tmpdir(), 'typewords-storage-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const store = new LocalDataStore(directory)
  const document = await store.snapshot()
  return { directory, store, generation: document.generation }
}

test('preserves nested values, undefined, dates and uploaded audio', async () => {
  const audio = new File([Uint8Array.from([0, 1, 128, 255])], 'test.mp3', {
    type: 'audio/mpeg',
    lastModified: 123,
  })

  const date = new Date('2026-01-02T00:00:00.000Z')
  const encoded = await encodeStoredValue({
    progress: 5,
    empty: undefined,
    date,
    files: [{ id: 'audio', file: audio }],
  })
  assert.equal(isStoredValue(encoded), true)
  const decoded = decodeStoredValue(JSON.parse(JSON.stringify(encoded))) as {
    progress: number
    empty: undefined
    date: Date
    files: { id: string; file: File }[]
  }
  assert.equal(decoded.progress, 5)
  assert.ok(Object.hasOwn(decoded, 'empty'))
  assert.equal(decoded.empty, undefined)
  assert.equal(decoded.date.toISOString(), date.toISOString())
  assert.equal(decoded.files[0].file.name, audio.name)
  assert.equal(decoded.files[0].file.type, audio.type)
  assert.equal(decoded.files[0].file.lastModified, audio.lastModified)
  assert.deepEqual(await decoded.files[0].file.arrayBuffer(), await audio.arrayBuffer())
})

test('round-trips a multi-megabyte audio upload', async () => {
  const blob = new Blob([new Uint8Array(5 * 1024 * 1024).fill(255)], { type: 'audio/mpeg' })
  const encoded = await encodeStoredValue(blob)
  assert.equal(isStoredValue(encoded), true)
  const restored = decodeStoredValue(encoded) as Blob
  assert.equal(restored.size, blob.size)
  assert.deepEqual(await restored.arrayBuffer(), await blob.arrayBuffer())
})

test('persists learning data to disk across server and browser restarts', async t => {
  const { directory, store, generation } = await fixture(t)
  const value = await encodeStoredValue(JSON.stringify({ val: { fsrsData: { apple: { reps: 3 } } }, version: 4 }))
  await store.mutate(generation, { action: 'set', key: 'typing-word-dict', value })
  const disk = JSON.parse(await readFile(join(directory, 'typewords.json'), 'utf8'))
  assert.deepEqual(disk.entries['typing-word-dict'], value)
  const restartedServer = new LocalDataStore(directory)
  const otherBrowser = await restartedServer.snapshot()
  assert.deepEqual(otherBrowser.entries['typing-word-dict'], value)
  assert.deepEqual(await readdir(directory), ['typewords.json'])
})

test('serializes concurrent writes without losing different keys', async t => {
  const { store, generation } = await fixture(t)
  await Promise.all(
    Array.from({ length: 20 }, async (_, index) =>
      store.mutate(generation, { action: 'set', key: `key-${index}`, value: await encodeStoredValue(index) })
    )
  )
  const snapshot = await store.snapshot()
  assert.equal(Object.keys(snapshot.entries).length, 20)
  assert.equal(snapshot.revision, 20)
})

test('clears records, audio, flow settings and all backups; rejects stale pages', async t => {
  const { directory, store, generation } = await fixture(t)
  const keys = [
    'typing-word-dict',
    'typing-word-files',
    'PracticeSaveWord',
    'PracticeSaveArticle',
    'PracticeSaveSentence',
    'PracticeFlowV2',
    'type-words-backup-index',
    'type-words-backup-old',
    'supabase_config',
  ]
  for (const key of keys) {
    await store.mutate(generation, { action: 'set', key, value: await encodeStoredValue('private-data') })
  }
  const cleared = await store.mutate(generation, { action: 'clear' })
  assert.deepEqual(cleared.entries, {})
  assert.notEqual(cleared.generation, generation)
  await assert.rejects(
    store.mutate(generation, {
      action: 'set',
      key: 'typing-word-dict',
      value: await encodeStoredValue('stale-data'),
    }),
    LocalDataConflict
  )
  await assert.rejects(store.snapshot(generation), LocalDataConflict)
  const disk = await readFile(join(directory, 'typewords.json'), 'utf8')
  assert.equal(disk.includes('private-data'), false)
  assert.deepEqual((await new LocalDataStore(directory).snapshot()).entries, {})
  await store.mutate(cleared.generation, {
    action: 'set',
    key: 'typing-word-dict',
    value: await encodeStoredValue('new-data'),
  })
  assert.equal(decodeStoredValue((await store.snapshot()).entries['typing-word-dict']), 'new-data')
})

test('detects conflicting read/modify/write updates', async t => {
  const { store, generation } = await fixture(t)
  const before = await store.snapshot()
  await store.mutate(generation, { action: 'set', key: 'audio', value: await encodeStoredValue([]) })
  await assert.rejects(
    store.mutate(generation, {
      action: 'set',
      key: 'audio',
      value: await encodeStoredValue(['stale']),
      expectedRevision: before.revision,
    }),
    LocalDataConflict
  )
})

test('imports browser records atomically and deletes individual keys', async t => {
  const { store, generation } = await fixture(t)
  await store.mutate(generation, {
    action: 'import',
    entries: { settings: await encodeStoredValue('settings'), audio: await encodeStoredValue(new Blob(['audio'])) },
  })
  await store.mutate(generation, { action: 'delete', key: 'settings' })
  const entries = (await store.snapshot()).entries
  assert.equal(entries.settings, undefined)
  assert.ok(decodeStoredValue(entries.audio) instanceof Blob)
})

test('does not silently replace a corrupted database', async t => {
  const { directory, store } = await fixture(t)
  const path = join(directory, 'typewords.json')
  await writeFile(path, '{broken JSON')
  await assert.rejects(store.snapshot(), SyntaxError)
  assert.equal(await readFile(path, 'utf8'), '{broken JSON')
})

test('reports invalid keys, values and unwritable directories', async t => {
  const { directory, store, generation } = await fixture(t)
  await assert.rejects(
    store.mutate(generation, {
      action: 'set',
      key: '__proto__',
      value: await encodeStoredValue('invalid'),
    }),
    TypeError
  )
  assert.equal(isStoredValue({ type: 'blob', value: 'not base64', mime: '' }), false)
  assert.equal(isStoredValue({ type: 'date', value: 'invalid' }), false)
  await assert.rejects(encodeStoredValue(1n), TypeError)
  const notDirectory = join(directory, 'not-a-directory')
  await writeFile(notDirectory, 'file')
  await assert.rejects(new LocalDataStore(notDirectory).snapshot())
})
