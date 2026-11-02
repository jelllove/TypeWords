<h1 align=center>
  <img src="https://github.com/user-attachments/assets/9d626e0f-0601-4640-8981-ad66d8ac4853" alt="TypeWords" style="width: 500px;"/>
</h1>

<p align="center">
  <a href="/README.md">English</a> |
  <a href="/docs/README.es.md">Español</a> |
  <a href="/docs/README.de.md">Deutsch</a> |
  <a href="/docs/README.fr.md">Français</a> |
  <a href="/docs/README.pt.md">Português</a> |
  <a href="/docs/README.ru.md">Русский</a> |
  <a href="/docs/README.uk.md">Українська</a> |
  <a href="/docs/README.ja.md">日本語</a> |
  <a href="/docs/README.ko.md">한국인</a> |
  <a href="/docs/README.th.md">ไทย</a> |
  <a href="/docs/README.vi.md">Tiếng Việt</a> |
  <a href="/docs/README.id.md">Bahasa Indonesia</a> |
  <a href="/docs/README.zh-TW.md">繁體中文</a> |
  <a href="/docs/README.zh-CN.md">简体中文</a> 
</p>

<p align="center">
  <b>Learn English, one keystroke at a time; smarter memorization, more efficient learning - an open-source word and article practice tool</b>
</p>

## Project Introduction

<https://www.bilibili.com/video/BV1QwYv6eEAS>

## Online Access

<https://typewords.cc>

<img width="1920" height="1440" alt="practice words" src="/public/imgs/words.png" />
<img width="1920" height="1440" alt="practice articles" src="/public/imgs/articles.png" />

## Features

### Word Practice

- Practice modes: Follow-along / Dictation / Self-test / Spelling from memory
- Smart mode: Automatically calculates learning words based on memory curves, deepening memory through dictation
- Free mode: No restrictions, plan your own learning
- Provides phonetics, pronunciation (American/British), example sentences, phrases, synonyms, root words, etymology, error statistics, and more

### Article Memorization

- Built-in classic textbooks; you can also add or import articles with one-click translation and bilingual comparison
- Follow-along + dictation dual modes, sentence-by-sentence input with automatic pronunciation for more efficient memorization
- Supports listening while writing from memory to reinforce learning

### Favorites, Wrong Words, Mastered

- Words typed incorrectly while learning are automatically added to your wrong word book for later review
- Actively add words to mastered to automatically skip them in future sessions
- Add words to favorites for consolidation and review

### Highly Customizable

- Rich keyboard sound effects
- Customizable shortcuts
- Highly configurable settings

### Clean and Efficient

- Clean design, modern UI, ad-free
- Refreshing interface, simple operation
- No forced subscription to any platform

### Vocabulary Library

The local version includes 10 vocabulary libraries: CET-4, CET-6, postgraduate English, IELTS, TOEFL, GRE, GMAT, SAT, TEM-4 and TEM-8. Select them from the recommended libraries or the full vocabulary list.

The nine additional community dictionaries are adapted from [qwerty-learner](https://github.com/RealKai42/qwerty-learner), under its GPL-3.0 license. They include Chinese definitions and available UK/US phonetics, but not detailed examples, phrases, synonyms or etymologies. They are study lists, not official exhaustive exam syllabuses. The existing CET-4 dictionary and learning records are unchanged.

All dictionary files ship locally; no runtime download from the official website is required. Online pronunciation still needs a network connection. See the [source manifest](./public/dicts/sources.json), [upstream license](./public/dicts/LICENSE.qwerty-learner) and [word counts](./docs/README.zh-CN.md#词库). Run `pnpm run dicts:import` to regenerate the same pinned revision (network required for this import command only); it never accesses the learning data directory.

## Running the Project

#### Note: This version requires a local Node server and saves data in a folder on your computer, not in the browser database.

This project is built with `Nuxt` and requires a Node.js environment.

1. Install Node.js 22.18+ (or a newer LTS), refer to the [official documentation](https://nodejs.org/en/download)
2. The project is large. It's recommended to use `git clone --depth 1 https://github.com/zyronon/TypeWords.git` to clone only the latest commit. GitHub's Download ZIP feature will not work properly.
3. In the project root directory, open a terminal and run `pnpm install` to download dependencies.
4. Run `pnpm run dev` to start the project. The default address is [`http://localhost:5567`](http://localhost:5567)
5. Open [`http://localhost:5567`](http://localhost:5567) in your browser to access the project.
6. For production, run `pnpm run build`, then `pnpm run serve` from the project root (default URL: `http://localhost:3000`). Set `HOST=127.0.0.1` to bind only to this computer.

### Double-click startup on Windows

After installing Node.js 22.18+ and running `pnpm install` and `pnpm run build`, double-click [TypeWords.cmd](./TypeWords.cmd). It starts the production build, waits for the local data service, and opens `http://127.0.0.1:5567/words`. Keep the console window open; Ctrl+C or closing it stops the server.

The launcher uses the project `data` folder by default. It reuses an existing TypeWords service only when the port and data folder match, and reports conflicts instead of stopping other applications. `TYPEWORDS_PORT` selects another port; `NUXT_LOCAL_DATA_DIR` or `TYPEWORDS_DATA_DIR` selects another data directory. `pnpm run local` is the command-line equivalent; `--no-browser` suppresses browser opening for tests.

The launcher requires the installed Node.js runtime and the complete `.output` directory, but does not require pnpm to start an already-built release. Build artifacts and learning data are not committed; a fresh clone must be installed and built first.

### Local data storage

- All learning records, FSRS data, settings, practice caches, uploaded audio and history backups are stored in `data/typewords.json`. Audio is stored as Base64. The folder is Git-ignored and must not be published.
- Browsers using the same server share this file. Clearing browser data does not delete learning records. Avoid editing the same learning records in multiple pages simultaneously.
- **Settings → Data management** shows the actual directory and provides **Migrate old browser data** and **Clear local folder data**. Existing ZIP import/export is still supported. Migration is explicit and never runs automatically.
- Clearing removes all user data, audio, backups and Supabase configuration from the file, leaving only empty database metadata. It does not delete built-in dictionaries, old browser data or remote Supabase data. Export a backup first; other open pages must reload.
- Stop the server before copying the entire `data` folder for a complete backup or moving it to another computer.
- Set `TYPEWORDS_DATA_DIR` before starting to use another directory (PowerShell example: `$env:TYPEWORDS_DATA_DIR = 'D:\TypeWordsData'`). Built servers also accept `NUXT_LOCAL_DATA_DIR`.
- A writable disk and a running local Node server are required. Static-only hosting via `pnpm run generate` is no longer supported. The data API accepts local requests only; do not expose this service publicly. File errors are reported explicitly, without falling back to browser storage.

## Features and Suggestions

The project is currently in early development, with new features being added continuously. If you have any suggestions or feature requests, feel free to open an `Issue`.
If you like the design philosophy of this software, please submit a `PR`. Thank you for your support!

## Contributing Guide

[Contributing Guidelines](/docs/CONTRIBUTING.md)

If you're interested in this project, we welcome your contributions and will provide as much help as possible.

Before contributing, please communicate with the developers to avoid code conflicts.

Thank you again for your contributions!


## ❤️ Support TypeWords
If TypeWords has been helpful to you, feel free to sponsor the project to support server operation and future development.  
Of course, sponsorship is not required for use—sharing the project, submitting feedback, or contributing code are also highly valuable forms of support.

<img width="300" height="390" alt="practice words" src="/public/imgs/zhifubao.png" />
<img width="300" height="390" alt="practice words" src="/public/imgs/weixin.png" />
