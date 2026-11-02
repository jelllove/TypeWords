import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { convertDictionary, DICTIONARIES, sha256, SOURCE_REVISION } from '../scripts/import-vocabulary.mjs'

const publicFile = path => new URL(`../public/${path}`, import.meta.url)
const readJson = async path => JSON.parse(await readFile(publicFile(path), 'utf8'))

test('converts source entries to complete TypeWords words without losing duplicate meanings', () => {
  const dictionary = DICTIONARIES[0]
  const input = [
    { name: ' apple ', ukphone: 'uk', usphone: 'us', trans: ['苹果 (n.)'] },
    { name: 'APPLE', ukphone: '', usphone: '', trans: ['苹果 (n.)', '苹果属植物 (n.)'] },
    { name: 'look  up', trans: ['查找（词语）'] },
  ]
  const words = convertDictionary(input, dictionary)
  assert.equal(words.length, 2)
  assert.equal(words[0].word, 'apple')
  assert.equal(words[0].phonetic0, 'uk')
  assert.equal(words[0].phonetic1, 'us')
  assert.deepEqual(words[0].trans, [
    { pos: 'n.', cn: '苹果' },
    { pos: 'n.', cn: '苹果属植物' },
  ])
  assert.equal(words[1].word, 'look up')
  assert.equal(words[1].trans[0].cn, '查找（词语）')
  assert.deepEqual(words[1].relWords, { root: '', rels: [] })
  assert.deepEqual(convertDictionary(input, dictionary), words)
})

test('rejects invalid source entries rather than generating empty or incomplete dictionaries', () => {
  for (const source of [
    null,
    [],
    [{ name: '', trans: ['meaning'] }],
    [{ name: 'word', trans: [] }],
    [{ name: 'word', trans: [null] }],
    [{ name: 'word', trans: ['meaning'], usphone: 5 }],
  ]) {
    assert.throws(() => convertDictionary(source, DICTIONARIES[0]))
  }
})

test('all nine local dictionaries are complete, unique, discoverable and checksum-verified', async () => {
  const [list, recommended, sources] = await Promise.all([
    readJson('list/word.json'),
    readJson('list/recommend_word.json'),
    readJson('dicts/sources.json'),
  ])
  assert.equal(new Set(list.map(resource => resource.id)).size, list.length)
  assert.equal(new Set(list.map(resource => resource.enName)).size, list.length)
  assert.equal(new Set(list.map(resource => resource.url)).size, list.length)
  assert.equal(sources.revision, SOURCE_REVISION)
  assert.equal(sources.license, 'GPL-3.0')
  const license = await readFile(publicFile(`dicts/${sources.licenseFile}`), 'utf8')
  assert.ok(license.includes('GNU GENERAL PUBLIC LICENSE'))
  assert.equal(sha256(license), sources.licenseSha256)
  for (const dictionary of DICTIONARIES) {
    const resource = list.find(item => item.enName === dictionary.enName)
    assert.ok(resource, `${dictionary.enName} missing from full list`)
    assert.deepEqual(
      recommended.find(item => item.enName === dictionary.enName),
      resource
    )
    assert.equal(resource.id, dictionary.id)
    assert.equal(resource.url, dictionary.file)
    assert.equal(resource.language, 'en')
    assert.ok(resource.category && resource.tags.length)
    const raw = await readFile(publicFile(`dicts/en/word/${resource.url}`), 'utf8')
    const words = JSON.parse(raw)
    assert.equal(words.length, resource.length)
    assert.ok(words.length >= 1000, `${dictionary.enName} contains only a sample`)
    const provenance = sources.dictionaries.find(item => item.enName === dictionary.enName)
    assert.equal(provenance.outputSha256, sha256(raw))
    assert.equal(provenance.words, words.length)
    assert.match(provenance.sourceSha256, /^[a-f0-9]{64}$/)
    assert.equal(new Set(words.map(word => word.word.toLowerCase())).size, words.length)
    assert.equal(new Set(words.map(word => word.id)).size, words.length)
    for (const word of words) {
      assert.ok(typeof word.word === 'string' && word.word.trim())
      assert.ok(typeof word.phonetic0 === 'string' && typeof word.phonetic1 === 'string')
      assert.ok(word.trans.length && word.trans.every(item => typeof item.pos === 'string' && item.cn.trim()))
      for (const field of ['sentences', 'phrases', 'synos', 'etymology']) assert.ok(Array.isArray(word[field]))
      assert.ok(typeof word.relWords.root === 'string' && Array.isArray(word.relWords.rels))
    }
  }
})

test('keeps the existing CET-4 resource and dataset in place', async () => {
  const [list, recommended, words] = await Promise.all([
    readJson('list/word.json'),
    readJson('list/recommend_word.json'),
    readJson('dicts/en/word/CET4_T.json'),
  ])
  const original = list.find(resource => resource.id === 1)
  assert.equal(original.enName, 'cet4')
  assert.equal(original.url, 'CET4_T.json')
  assert.equal(original.length, 2607)
  assert.equal(words.length, 2607)
  assert.deepEqual(
    recommended.find(resource => resource.id === 1),
    original
  )
})
