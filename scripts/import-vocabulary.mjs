import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'

export const SOURCE_REPOSITORY = 'RealKai42/qwerty-learner'
export const SOURCE_REVISION = '1182426f2bd0a28c95302c33f9e19136b1262a70'
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url))

export const DICTIONARIES = [
  {
    id: 2,
    enName: 'cet6',
    name: 'CET-6',
    description: '大学英语六级词库',
    file: 'CET6_T.json',
    category: '中国考试',
    tags: ['大学英语'],
  },
  {
    id: 3,
    enName: 'kaoyan',
    name: '考研英语',
    description: '研究生入学考试英语词库',
    file: 'KaoYan_3_T.json',
    category: '中国考试',
    tags: ['考研英语'],
  },
  {
    id: 4,
    enName: 'ielts',
    name: 'IELTS 雅思',
    description: '雅思考试英语词库',
    file: 'IELTS_3_T.json',
    category: '出国考试',
    tags: ['雅思'],
  },
  {
    id: 5,
    enName: 'toefl',
    name: 'TOEFL 托福',
    description: '托福考试英语词库',
    file: 'TOEFL_3_T.json',
    category: '出国考试',
    tags: ['托福'],
  },
  {
    id: 6,
    enName: 'gre',
    name: 'GRE',
    description: 'GRE 考试英语词库',
    file: 'GRE_3_T.json',
    category: '出国考试',
    tags: ['研究生入学'],
  },
  {
    id: 7,
    enName: 'gmat',
    name: 'GMAT',
    description: 'GMAT 考试英语词库',
    file: 'GMAT_3_T.json',
    category: '出国考试',
    tags: ['商科入学'],
  },
  {
    id: 8,
    enName: 'sat',
    name: 'SAT',
    description: 'SAT 考试英语词库',
    file: 'SAT_3_T.json',
    category: '出国考试',
    tags: ['本科入学'],
  },
  {
    id: 9,
    enName: 'tem4',
    name: 'TEM-4 专四',
    description: '英语专业四级词库',
    file: 'Level4luan_2_T.json',
    category: '中国考试',
    tags: ['英语专业'],
  },
  {
    id: 10,
    enName: 'tem8',
    name: 'TEM-8 专八',
    description: '英语专业八级词库',
    file: 'Level8luan_2_T.json',
    category: '中国考试',
    tags: ['英语专业'],
  },
]

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function translation(text) {
  const match = text.match(/\s*\(((?:[a-z]+\.\s*(?:\/\s*)?)+)\)\s*$/i)
  return match && text.slice(0, match.index).trim()
    ? { pos: match[1].trim(), cn: text.slice(0, match.index).trim() }
    : { pos: '', cn: text }
}

export function convertDictionary(source, dictionary) {
  if (!Array.isArray(source) || source.length === 0) throw new Error(`${dictionary.file}: empty dictionary`)
  const words = new Map()
  for (const [index, entry] of source.entries()) {
    if (
      !entry ||
      typeof entry.name !== 'string' ||
      !entry.name.trim() ||
      !Array.isArray(entry.trans) ||
      !entry.trans.length ||
      !entry.trans.every(text => typeof text === 'string' && text.trim()) ||
      (entry.ukphone !== undefined && typeof entry.ukphone !== 'string') ||
      (entry.usphone !== undefined && typeof entry.usphone !== 'string')
    ) {
      throw new Error(`${dictionary.file}: invalid entry at index ${index}`)
    }
    const word = entry.name.trim().replace(/\s+/g, ' ')
    const key = word.toLowerCase()
    const trans = entry.trans.map(text => translation(text.trim()))
    const existing = words.get(key)
    if (existing) {
      for (const item of trans) {
        if (!existing.trans.some(old => old.pos === item.pos && old.cn === item.cn)) existing.trans.push(item)
      }
      continue
    }
    words.set(key, {
      id: `local-${dictionary.enName}-${sha256(key).slice(0, 16)}`,
      word,
      phonetic0: entry.ukphone?.trim() ?? '',
      phonetic1: entry.usphone?.trim() ?? '',
      trans,
      sentences: [],
      phrases: [],
      synos: [],
      relWords: { root: '', rels: [] },
      etymology: [],
    })
  }
  return [...words.values()]
}

async function download(path) {
  const url = `https://raw.githubusercontent.com/${SOURCE_REPOSITORY}/${SOURCE_REVISION}/${path}`
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`)
  return response.text()
}

async function main() {
  const listPath = join(publicDirectory, 'list', 'word.json')
  const recommendedPath = join(publicDirectory, 'list', 'recommend_word.json')
  const [currentList, currentRecommended, license, datasets] = await Promise.all([
    readFile(listPath, 'utf8').then(JSON.parse),
    readFile(recommendedPath, 'utf8').then(JSON.parse),
    download('LICENSE'),
    Promise.all(
      DICTIONARIES.map(async dictionary => {
        const sourcePath = `public/dicts/${dictionary.file}`
        const raw = await download(sourcePath)
        const source = JSON.parse(raw)
        const words = convertDictionary(source, dictionary)
        if (words.length < 1000) throw new Error(`${dictionary.file}: unexpectedly small dictionary (${words.length})`)
        const output = '[\n' + words.map(word => JSON.stringify(word)).join(',\n') + '\n]\n'
        return {
          dictionary,
          words,
          output,
          provenance: {
            enName: dictionary.enName,
            sourcePath,
            sourceSha256: sha256(raw),
            outputPath: `en/word/${dictionary.file}`,
            outputSha256: sha256(output),
            sourceEntries: source.length,
            words: words.length,
          },
        }
      })
    ),
  ])
  if (!license.includes('GNU GENERAL PUBLIC LICENSE') || !license.includes('Version 3')) {
    throw new Error('Unexpected upstream license')
  }
  const resources = datasets.map(({ dictionary, words }) => ({
    id: dictionary.id,
    enName: dictionary.enName,
    name: dictionary.name,
    description: dictionary.description + '（社区整理版）',
    url: dictionary.file,
    length: words.length,
    language: 'en',
    translateLanguage: 'zh-CN',
    version: 1,
    type: 'word',
    recommended: true,
    hidden: false,
    category: dictionary.category,
    tags: dictionary.tags,
  }))
  const generatedIds = new Set(resources.map(resource => resource.id))
  const generatedNames = new Set(resources.map(resource => resource.enName))
  const merge = list => [...list.filter(resource => !generatedNames.has(resource.enName)), ...resources]
  for (const resource of [...currentList, ...currentRecommended]) {
    if (generatedIds.has(resource.id) && !generatedNames.has(resource.enName)) {
      throw new Error(`Dictionary ID collision: ${resource.id}`)
    }
  }
  await Promise.all(
    datasets.map(({ dictionary, output }) =>
      writeFile(join(publicDirectory, 'dicts', 'en', 'word', dictionary.file), output)
    )
  )
  await Promise.all([
    writeFile(listPath, JSON.stringify(merge(currentList), null, 2) + '\n'),
    writeFile(recommendedPath, JSON.stringify(merge(currentRecommended), null, 2) + '\n'),
    writeFile(join(publicDirectory, 'dicts', 'LICENSE.qwerty-learner'), license),
    writeFile(
      join(publicDirectory, 'dicts', 'sources.json'),
      JSON.stringify(
        {
          repository: `https://github.com/${SOURCE_REPOSITORY}`,
          revision: SOURCE_REVISION,
          license: 'GPL-3.0',
          licenseFile: 'LICENSE.qwerty-learner',
          licenseSha256: sha256(license),
          attribution: 'qwerty-learner contributors; upstream dictionary source: kajweb/dict',
          conversion:
            'Renamed word/phonetic fields; extracted part-of-speech suffixes; merged case-insensitive duplicates. Unavailable example, phrase, synonym and etymology fields are empty.',
          dictionaries: datasets.map(dataset => dataset.provenance),
        },
        null,
        2
      ) + '\n'
    ),
  ])
  for (const { dictionary, words } of datasets) console.log(`${dictionary.name}: ${words.length}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error('Vocabulary import failed:', error)
    process.exitCode = 1
  })
}
