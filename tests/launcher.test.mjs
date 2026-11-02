import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { getLaunchConfig, probeServer } from '../scripts/start-local.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const exec = promisify(execFile)

async function fixture(t, response) {
  const server = createServer((request, outgoing) => {
    assert.equal(request.url, '/api/local-data?status=1')
    assert.equal(request.headers['x-typewords-local'], '1')
    outgoing.setHeader('Content-Type', 'application/json')
    outgoing.end(JSON.stringify(response))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  return getLaunchConfig({ TYPEWORDS_PORT: String(server.address().port) }, root)
}

test('launcher defaults to loopback and the project data folder', () => {
  const config = getLaunchConfig({}, root)
  assert.equal(config.port, 5567)
  assert.equal(config.origin, 'http://127.0.0.1:5567')
  assert.equal(config.dataDirectory, resolve(root, 'data'))
  assert.equal(config.entry, join(root, '.output', 'server', 'index.mjs'))
})

test('launcher honors a custom port and data folder', () => {
  const config = getLaunchConfig({ TYPEWORDS_PORT: '5583', TYPEWORDS_DATA_DIR: 'custom-data' }, root)
  assert.equal(config.port, 5583)
  assert.equal(config.dataDirectory, resolve(root, 'custom-data'))
  const preferred = getLaunchConfig({ TYPEWORDS_DATA_DIR: 'one', NUXT_LOCAL_DATA_DIR: 'two' }, root)
  assert.equal(preferred.dataDirectory, resolve(root, 'two'))
  for (const port of ['0', '-1', '65536', 'abc', '1.5', '']) {
    assert.throws(() => getLaunchConfig({ TYPEWORDS_PORT: port }, root))
  }
})

test('launcher only reuses a healthy server with the same data directory', async t => {
  const config = await fixture(t, { app: 'typewords-local', status: 'ready', directory: join(root, 'data') })
  assert.equal((await probeServer(config)).kind, 'ready')
  assert.equal((await probeServer({ ...config, dataDirectory: join(root, 'different') })).kind, 'other')
})

test('launcher does not open an unrelated service', async t => {
  const config = await fixture(t, { app: 'another-app' })
  const status = await probeServer(config)
  assert.equal(status.kind, 'other')
  assert.match(status.error.message, /another service/)
})

test(
  'Windows double-click entry reuses the running service without starting a second server',
  {
    skip: process.platform !== 'win32',
  },
  async t => {
    const config = await fixture(t, { app: 'typewords-local', status: 'ready', directory: join(root, 'data') })
    const { stdout } = await exec(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'TypeWords.cmd --no-browser'], {
      cwd: root,
      env: {
        ...process.env,
        TYPEWORDS_PORT: String(config.port),
        NUXT_LOCAL_DATA_DIR: config.dataDirectory,
      },
      timeout: 10000,
    })
    assert.match(stdout, /already running/)
  }
)
