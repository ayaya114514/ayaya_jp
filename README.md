# ayaya日语

一个本地运行的日语 flashcard 程序，包含假名互记、N5/N4 单词双向记忆、N5/N4 语法练习，以及对应错题集。点击卡片翻面时会自动播放读音，答案区也可以手动重播。
右上角的主题按钮可以切换浅色 / 暗色模式，选择会保存在浏览器 `localStorage` 中。

在线网址：https://ayaya114514.github.io/ayaya_jp/

## 使用

直接打开 `index.html`，或在目录里启动一个本地 server：

```bash
python3 -m http.server 5173
```

然后访问 `http://localhost:5173`。

## 检查

```bash
npm run validate
npm run validate:bundle
```

这个检查会验证 JS 语法、HTML 引用的本地资源、N5/N4 JS/JSON 数据一致性、词库和语法字段完整性，以及 card builder 是否能生成假名、N5/N4 词汇和 N5/N4 语法卡片。
`validate:bundle` 会复跑压缩包自带的计数检查。

## 练习逻辑

- 所有普通模块按随机顺序出题，一轮练完后可以点 `重新开始` 再洗牌。
- `清楚`、`不确定`、`遗忘` 只记录你的选择，不再计算复习间隔。
- N5 里选择 `不确定` 或 `遗忘` 的词会进入 `N5 错题集`；N4 同理进入 `N4 错题集`；在错题集里选 `清楚` 后会移出。
- 语法模块按 N5/N4 分开练 `中→日`、`日→中`、`文型` 和 `选择题`；普通语法卡选择 `不确定` 或 `遗忘` 后会进入对应语法错题集。
- 语法选择题覆盖每条 N5/N4 语法；每轮重新开始会重新打乱题目顺序，每题选项顺序也会重新打乱，并避免正确项连续落在同一位置。
- 答案区底部会显示当前卡片最近的记忆链条，保留最近 12 次评分记录；选择题会记录 `选择正确` / `选择错误`。

所有进度保存在浏览器 `localStorage` 中。

## 词库数据来源

当前项目完全使用 `n5-codex-vocab.js` / `n5-codex-vocab.json` 作为 N5 数据源，共 718 条。
当前项目完全使用 `ayaya-n4-codex-vocab.js` / `ayaya-n4-codex-vocab.json` 作为 N4 数据源，共 767 条。

数据字段包括规范词形、原始词形、变体、读音、罗马音、词性、简体中文释义、整词 furigana 信息，以及每个词 3 条日语例句和简体中文翻译。

前端实际加载 `n5-codex-vocab.js` 和 `ayaya-n4-codex-vocab.js`。对应 `.json` 文件保留为同源的可读/可校对数据文件。

## 语法数据

当前项目使用 `grammar-data.js` 作为 N5/N4 语法数据源，共 216 条。每条语法题包含文型、中文意思、接续、提示、中文 prompt、标准日语答案，以及 3 条例句。

`card-data.js` 会为每条语法生成 4 张卡：`中→日`、`日→中`、`文型`、`选择题`。当前完整数据包计数为：

- 假名 / 音变卡片：251
- 词汇卡片：2,970
- 语法卡片：864
- 总卡片：4,085

## 文件结构

- `index.html`：页面结构和脚本加载顺序。
- `styles.css`：页面样式。
- `card-data.js`：假名、N5/N4 数据转换、例句和卡片构建逻辑。
- `grammar-data.js`：N5/N4 语法练习数据。
- `app.js`：学习状态、渲染、交互和语音播放逻辑。
- `scripts/validate.js`：本地无依赖 validation。
- `validate-bundle.js` / `validation-report.json`：压缩包自带的 bundle validation 和计数报告。
