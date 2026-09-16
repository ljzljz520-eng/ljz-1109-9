# 纸鸢录 · 传统风筝工艺站

讲传统风筝的**骨架（扎）、糊纸（糊）、彩绘（绘）、试飞（放）**四步与**地域流派**的静态网站。
所有内容由本地 `data/manifest.json` 驱动，构建为纯静态文件；**禁用 JavaScript、直接用
`file://` 打开 `dist/index.html` 也能浏览主要内容**。

## 快速开始

```bash
npm run build      # 读取 manifest，生成 dist/（零依赖）
npm run validate   # 校验相对路径 / 锚点 / 版本元数据 / img alt
npm test           # 构建 + 校验
```

然后直接用浏览器打开 `dist/index.html`，或：

```bash
cd dist && python3 -m http.server 8000
```

## 页面

| 页面 | 说明 |
| --- | --- |
| `index.html` | 首页：四艺、流派、精选作品 |
| `craft.html` | 扎糊绘放四步，每步可**逐步点开**（原生 `<details>`，无脚本），含工艺要点与子步骤 |
| `gallery.html` | 作品图库，支持按**造型**筛选（禽鸟/昆虫/水族/人物/板形/串式） |
| `schools.html` | 北京哈氏、天津软翅、潍坊串式、南通板鹞、阳江灵芝五大流派 |
| `works/*.html` | 作品详情：**寓意**与**制作周期**、规格、所属流派与造型 |

## 无脚本 / 深链接设计

- **步骤演示**：用原生 `<details>/<summary>` 折叠，首步默认展开；每步有固定锚点
  （`craft.html#skeleton`、`#paper`、`#paint`、`#fly`）。
- **造型筛选**：纯 CSS `:target` 实现，无 JS。筛选链接即锚点：
  - `gallery.html#filter-fish` 直接打开即只显示水族；
  - `#all` 恢复全部；选中态由 CSS 高亮，可直接分享地址栏 URL。
- **作品深链接**：每件作品为独立静态页 `works/<id>.html`（如 `works/banyao.html`），
  详情页的“所属造型”链接回带筛选状态的图库。
- **流派深链接**：`schools.html#nantong` 等锚点直达。

## 数据驱动

`data/manifest.json` 是唯一内容源：`steps / schools / categories / works` 与站点版本元数据。
新增作品只需在 `works` 中加一条并放入对应图片，再 `npm run build`；构建产物中会附带一份
`dist/data/manifest.json` 便于核对数据来源。

## 韧性与校验

- 每张图都有**描述性 `alt`** 与常驻 `figcaption`；图片加载失败时，画面说明与文字内容仍然完整可读。
- `scripts/validate.js` 对 `dist/` 做构建期校验：
  1. 每个相对 `href/src` 按所在文件解析后必须存在（拒绝绝对/外链依赖）；
  2. 每个跨页/页内 `#锚点` 在目标页面必须有对应 `id`；
  3. 每页 `site-version / generator / manifest-source` 元数据与 manifest 一致；
  4. 每个 `<img>` 必须带非空且有信息量的 `alt`；
  5. manifest 声明的图片资源必须存在。

## 目录

```
data/manifest.json        内容数据源（步骤/流派/分类/作品/版本）
scripts/build.js          零依赖构建：manifest -> dist/*.html
scripts/validate.js       产物校验：路径/锚点/版本/alt
assets/css/style.css      样式（含 :target 筛选与 <details> 样式）
assets/img/*.svg          本地插画（无外链图片）
dist/                     构建产物（可直接 file:// 打开）
```
