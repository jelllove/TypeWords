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
  <b>学习英语，一次敲击，一点进步；记忆不再盲目，学习更高效，开源单词与文章练习工具</b>
</p>

## 项目介绍

<https://www.bilibili.com/video/BV1QwYv6eEAS>

<!-- <p align="center">
  <a href="https://github.com/zyronon/type-word/blob/master/LICENSE"><img src="https://img.shields.io/github/license/zyronon/type-word" alt="License"></a>
  <a><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"/></a>
  <a><img src="https://img.shields.io/badge/Powered%20by-Vue-blue"/></a>
  <a href="https://hellogithub.com/repository/eb70616d65604458908fc1736e7d41fc" target="_blank"><img src="https://abroad.hellogithub.com/v1/widgets/recommend.svg?rid=eb70616d65604458908fc1736e7d41fc&claim_uid=k5e4ZAqRjJEGzCW&theme=small" alt="Featured｜HelloGitHub" /></a>
</p> -->

<!-- <div align=center>
  <a href="https://trendshift.io/repositories/15226" target="_blank"><img src="https://trendshift.io/api/badge/repositories/15226" alt="zyronon%2FTypeWords | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</div> -->

## 在线访问

[https://typewords.cc](https://typewords.cc)   


<img width="1920" height="1440" alt="practice words" src="/public/imgs/words.png" />
<img width="1920" height="1440" alt="practice articles" src="/public/imgs/articles.png" />



## 功能列表

### 单词练习

- 练习模式：跟写 / 听写 / 自测 / 默写
- 智能模式：记忆曲线自动计算学习单词，并通过默写加深记忆
- 自由模式：不受限制，自行规划
- 提供音标、发音（美音、英音）、例句、短语、近义词、同根词、词源、错误统计等功能

### 背文章

- 内置经典教材书籍，也可自行添加、导入文章，提供一键翻译、译文对照功能
- 跟打 + 默写双模式，逐句输入，自动发音，让背诵更高效
- 支持边听边默写，强化记忆

### 收藏、错词本、已掌握

- 学习单词时输入错误自动添加到错词本，方便后续复习
- 可主动添加到已掌握，后续学习时自动跳过
- 可主动添加到收藏中，以便巩固复习

### 高度自由

- 丰富的键盘音效
- 可自定义快捷键
- 高度定制化的设置选项

### 简洁高效

- 简洁设计，现代化UI，无广告
- 界面清爽，操作简单
- 不强制关注任何平台

### 词库

本地现已内置以下 10 个词库，可在单词页的推荐词库或“全部词库”中选择：

| 词库 | 词条数 |
| --- | ---: |
| CET-4 四级 | 2607 |
| CET-6 六级 | 2345 |
| 考研英语 | 3727 |
| IELTS 雅思 | 3575 |
| TOEFL 托福 | 4264 |
| GRE | 6514 |
| GMAT | 3047 |
| SAT | 4463 |
| TEM-4 专四 | 4025 |
| TEM-8 专八 | 12197 |

新增的 9 个词库来自 [qwerty-learner](https://github.com/RealKai42/qwerty-learner)，按其 GPL-3.0 许可保留来源及许可说明，并适配为 TypeWords 格式。它们是社区整理版，不代表官方考试大纲全集；包含中文释义和源数据提供的英美音标，不含详细例句、短语、近义词和词源，原有四级数据保持不变。

词库 JSON 随项目一起保存，运行时不需要从官网或第三方下载；在线发音等功能仍需要网络。不同词库之间会有重叠，表中为各词库内去重后的词条数。

[来源、版本、词条数与校验值](../public/dicts/sources.json)和[上游许可证](../public/dicts/LICENSE.qwerty-learner)随项目提供。需要重新生成相同版本的数据时，可运行 `pnpm run dicts:import`（仅此导入步骤需要联网）。该命令只更新静态词库和列表，不会操作学习数据文件夹。

## 运行

#### 注：本项目需运行本地 Node 服务，数据保存在电脑上的文件夹中，不再保存在浏览器数据库中。

本项目是基于`Nuxt`开发的，需要 node 环境来运行。

1. 安装 Node.js 22.18+（或更新的 LTS），参考[官方文档](https://nodejs.org/en/download)
2. 项目文件很大，推荐使用 `git clone --depth 1 https://github.com/zyronon/TypeWords.git` 命令只克隆最近一次提交。直接下载
   Github 提供的 Download ZIP 功能是无法运行的
3. 在项目根目录下，打开命令行，运行`pnpm install`来下载依赖。
4. 执行`pnpm run dev`来启动项目，项目默认地址为[`http://localhost:5567`](http://localhost:5567)
5. 在浏览器中打开[`http://localhost:5567`](http://localhost:5567)  来访问项目。
6. 正式使用可执行 `pnpm run build`，再执行 `pnpm run serve`（默认访问 `http://localhost:3000`）。请在项目根目录运行。

### Windows 双击启动

安装 Node.js 22.18+ 并完成 `pnpm install`、`pnpm run build` 后，直接双击项目根目录的 [TypeWords.cmd](../TypeWords.cmd)。启动器会运行构建后的本地服务，并在确认数据服务可用后自动打开浏览器。

- 默认地址为 `http://127.0.0.1:5567/words`，默认数据文件夹仍是项目根目录的 `data`。启动器不依赖 `pnpm`，但需要本机已安装的 Node.js 和完整的 `.output` 文件夹。
- 首次启动的控制台窗口需保持打开，按 Ctrl+C 或关闭该窗口即可停止服务。若同一端口已有使用相同数据目录的 TypeWords 服务，则直接打开已有服务，不会重复启动。
- 如果端口被其他程序占用，或该端口的 TypeWords 使用了其他数据目录，启动器会明确报错，不会关闭其他程序或打开错误的数据。
- 可通过 `TYPEWORDS_PORT` 指定其他端口，通过 `NUXT_LOCAL_DATA_DIR`（优先）或 `TYPEWORDS_DATA_DIR` 指定数据目录。也可在终端运行 `pnpm run local`；测试启动时可加 `--no-browser`。
- 启动器已加入版本控制；构建产物和个人学习数据不会推送到仓库。重新克隆项目后需要先安装依赖并构建。

### 本地数据存储

- 默认文件为项目根目录下的 `data/typewords.json`，保存学习进度、FSRS 记忆记录、设置、练习缓存、自定义音频和历史备份。音频以 Base64 形式保存在文件中。此文件夹已加入 Git 忽略规则，不应提交或公开。
- 同一服务下的不同浏览器共用此文件；更换浏览器或清除浏览器缓存不会删除学习数据。多个页面同时操作同一学习记录仍可能覆盖彼此，请避免同时学习。
- 在“设置 → 数据管理”可以查看实际目录、迁移当前浏览器的旧数据，或通过原有 ZIP 导入功能恢复官网/其他设备的数据。旧浏览器数据不会自动导入，也不会在清空后自动恢复。
- 点击“清空本地文件夹数据”并确认，会删除文件中的全部用户数据（包括自定义音频、历史备份和 Supabase 配置），仅保留空数据库的版本元数据。不会删除内置词库、浏览器旧数据或 Supabase 远端数据；清空前请导出备份，其他已打开页面需刷新。
- 服务停止后，可以复制整个 `data` 文件夹进行完整备份或迁移。请勿在服务运行时手动修改数据文件。
- 可在启动前通过 `TYPEWORDS_DATA_DIR` 指定其他目录，例如 PowerShell：`$env:TYPEWORDS_DATA_DIR = 'D:\TypeWordsData'`。构建后的服务也支持 `NUXT_LOCAL_DATA_DIR` 环境变量。
- 此版本需要可写磁盘和持续运行的本地 Node 服务，不支持 `pnpm run generate` 后仅部署静态文件。数据接口只允许本机访问，不应公开到互联网。`pnpm run serve` 时建议设置 `$env:HOST = '127.0.0.1'`。
- 无法读写文件时会明确报错，不会回退到浏览器存储。
 
## 功能与建议

目前项目处于开发初期，新功能正在持续添加中，如果你对软件有任何功能与建议，欢迎在 `Issues` 中提出
如果你也喜欢本软件的设计思想，欢迎提交 `Pr`，非常感谢你对我们的支持！

## 贡献指南

[贡献准则](/docs//CONTRIBUTING.md)

如果您对本项目感兴趣，我们非常欢迎参与到项目的贡献中，我们会尽可能地提供帮助

在贡献前，我们希望您能与开发者进行沟通，以避免代码冲突

再次感谢您对项目的贡献！🎉

## ❤️ 支持 TypeWords

如果 TypeWords 对您有所帮助，欢迎赞助项目，支持服务器运行和后续开发。   
当然，不赞助也完全不影响使用。分享项目、提交反馈或贡献代码，同样是非常宝贵的支持。

<img width="300" height="390" alt="practice words" src="/public/imgs/zhifubao.png" />
<img width="300" height="390" alt="practice words" src="/public/imgs/weixin.png" />
