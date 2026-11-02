import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const root = fileURLToPath(new URL('../', import.meta.url))

export function getLaunchConfig(env = process.env, directory = root) {
  const rawPort = env.TYPEWORDS_PORT ?? '5567'
  const port = Number(rawPort)
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('TYPEWORDS_PORT must be an integer between 1 and 65535.')
  }
  const dataDirectory = resolve(directory, env.NUXT_LOCAL_DATA_DIR || env.TYPEWORDS_DATA_DIR || 'data')
  return {
    root: directory,
    port,
    origin: `http://127.0.0.1:${port}`,
    dataDirectory,
    entry: join(directory, '.output', 'server', 'index.mjs'),
  }
}

function sameDirectory(left, right) {
  const normalize = path => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))
  return normalize(left) === normalize(right)
}

export async function probeServer(config) {
  let response
  try {
    response = await fetch(`${config.origin}/api/local-data?status=1`, {
      headers: { 'X-TypeWords-Local': '1' },
      signal: AbortSignal.timeout(1000),
      cache: 'no-store',
    })
  } catch (error) {
    return { kind: 'unreachable', error }
  }
  if (!response.ok) return { kind: 'other', error: new Error(`Port ${config.port} returned HTTP ${response.status}.`) }
  let status
  try {
    status = await response.json()
  } catch (error) {
    return { kind: 'other', error }
  }
  if (status?.app !== 'typewords-local' || status.status !== 'ready' || typeof status.directory !== 'string') {
    return { kind: 'other', error: new Error(`Port ${config.port} is used by another service or an older build.`) }
  }
  if (!sameDirectory(status.directory, config.dataDirectory)) {
    return { kind: 'other', error: new Error(`Port ${config.port} uses a different data folder: ${status.directory}`) }
  }
  return { kind: 'ready' }
}

async function openBrowser(url) {
  await new Promise((resolve, reject) => {
    const opener = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
      stdio: 'ignore',
      windowsHide: true,
    })
    opener.once('error', reject)
    opener.once('exit', code => (code === 0 ? resolve() : reject(new Error(`Browser opener exited with ${code}.`))))
  })
}

async function main() {
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major < 22 || (major === 22 && minor < 18)) throw new Error('Node.js 22.18 or newer is required.')
  if (process.argv.slice(2).some(argument => argument !== '--no-browser')) {
    throw new Error('Only --no-browser is supported.')
  }
  const showBrowser = !process.argv.includes('--no-browser')
  const config = getLaunchConfig()
  const url = `${config.origin}/words`
  const existing = await probeServer(config)
  if (existing.kind === 'other') {
    throw new Error(`${existing.error.message} Close that service or set TYPEWORDS_PORT to another port.`)
  }
  if (existing.kind === 'ready') {
    console.log(`TypeWords is already running: ${url}`)
    if (showBrowser) await openBrowser(url)
    return
  }
  try {
    await access(config.entry)
  } catch (error) {
    throw new Error('The production build is missing. Run pnpm install and pnpm run build first.', { cause: error })
  }
  const child = spawn(process.execPath, [config.entry], {
    cwd: config.root,
    stdio: 'inherit',
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      NITRO_HOST: '127.0.0.1',
      PORT: String(config.port),
      NITRO_PORT: String(config.port),
      NUXT_LOCAL_DATA_DIR: config.dataDirectory,
    },
  })
  let spawnError
  let stopping = false
  child.once('error', error => {
    spawnError = error
  })
  const stop = () => {
    stopping = true
    child.kill()
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  try {
    let status = existing
    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError
      if (child.exitCode !== null) throw new Error(`The server exited with code ${child.exitCode}.`)
      status = await probeServer(config)
      if (status.kind === 'ready') break
      if (status.kind === 'other') throw status.error
      await sleep(250)
    }
    if (status.kind !== 'ready')
      throw new Error('The server did not become ready within 30 seconds.', { cause: status.error })
    console.log(`TypeWords is ready: ${url}`)
    console.log(`Data folder: ${config.dataDirectory}`)
    console.log('Keep this window open. Press Ctrl+C or close it to stop the server.')
    if (showBrowser) {
      try {
        await openBrowser(url)
      } catch (error) {
        console.error(`Could not open the browser automatically. Open ${url} manually.`, error)
      }
    }
    const exitCode = await new Promise(resolve => {
      if (child.exitCode !== null) resolve(child.exitCode)
      else child.once('exit', code => resolve(code))
    })
    if (!stopping && exitCode !== 0) throw new Error(`The server stopped unexpectedly (exit ${exitCode}).`)
  } finally {
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
    if (child.exitCode === null && !child.killed) child.kill()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error('TypeWords startup failed:', error)
    process.exitCode = 1
  })
}
