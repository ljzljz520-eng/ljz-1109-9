#!/usr/bin/env node
/**
 * 纸鸢录 · 静态站构建脚本（零依赖）
 * 读取 data/manifest.json，渲染纯静态 HTML 到 dist/。
 * 产物不依赖任何服务器，file:// 直接打开即可。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/manifest.json'), 'utf8'));
const { site, steps, schools, categories, works } = manifest;

const CN_NUM = ['壹', '贰', '叁', '肆', '伍', '陆'];
const catsById = Object.fromEntries(categories.map(c => [c.id, c]));
const schoolsById = Object.fromEntries(schools.map(s => [s.id, s]));
const worksById = Object.fromEntries(works.map(w => [w.id, w]));

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const countByCat = Object.fromEntries(categories.map(c => [c.id, works.filter(w => w.category === c.id).length]));

/* ---------------- 布局 ---------------- */
function head({ title, description, prefix, extraHead = '' }) {
  const p = prefix; // 相对根目录的前缀，根页为 ''，子目录页为 '../'
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${esc(site.name)}</title>
<meta name="description" content="${esc(description || site.description)}">
<meta name="generator" content="${esc(site.generator)}">
<meta name="site-version" content="${esc(site.version)}">
<meta name="manifest-source" content="${esc(site.dataFile)}">
<link rel="icon" type="image/svg+xml" href="${p}assets/img/favicon.svg">
<link rel="stylesheet" href="${p}assets/css/style.css">
${extraHead}</head>`;
}

function header(active, prefix) {
  const p = prefix;
  const nav = [
    ['index.html', '首页'],
    ['craft.html', '扎糊绘放'],
    ['gallery.html', '作品图库'],
    ['schools.html', '地域流派'],
  ].map(([file, label]) =>
    `      <a href="${p}${file}"${active === file ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('\n');
  return `
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${p}index.html">
      <span class="seal" aria-hidden="true">鸢</span>
      <span><strong>纸鸢录</strong><small>传统风筝工艺 · 扎糊绘放</small></span>
    </a>
    <nav class="site-nav" aria-label="主导航">
${nav}
    </nav>
  </div>
</header>`;
}

function footer(prefix) {
  return `
<footer class="site-footer">
  <div class="wrap">
    <nav aria-label="页脚导航">
      <a href="${prefix}index.html">首页</a>
      <a href="${prefix}craft.html">骨架 · 糊纸 · 彩绘 · 试飞</a>
      <a href="${prefix}gallery.html">作品图库</a>
      <a href="${prefix}schools.html">地域流派</a>
    </nav>
    <div>本站所有步骤演示、造型筛选与作品详情均不依赖 JavaScript；禁用脚本或以 file:// 打开 dist 目录，仍可展开步骤、按造型筛选并深链至具体作品。</div>
    <div class="meta-line">版本 v${esc(site.version)} ｜ 数据更新于 ${esc(site.updated)} ｜ 内容由 <code>${esc(site.dataFile)}</code> 驱动，经 <code>${esc(site.generator)}</code> 生成</div>
  </div>
</footer>`;
}

function page({ file, active, title, description, prefix = '', body, extraHead = '' }) {
  return `${head({ title, description, prefix, extraHead })}
<body${active ? ` class="page-${active.replace('.html', '')}"` : ''}>
${header(active, prefix)}
<main>
${body}
</main>
${footer(prefix)}
</body>
</html>
`;
}

function figure(w, prefix) {
  return `      <figure class="shot">
        <img src="${prefix}${esc(w.image)}" alt="${esc(w.alt)}" loading="lazy">
        <figcaption>${esc(w.caption || w.summary || '')}</figcaption>
      </figure>`;
}

function workCard(w, prefix) {
  return `      <a class="work-card" data-cat="${esc(w.category)}" href="${prefix}works/${esc(w.id)}.html">
        <span class="work-thumb"><img src="${prefix}${esc(w.image)}" alt="${esc(w.alt)}" loading="lazy"></span>
        <span class="work-info">
          <h3>${esc(w.name)}</h3>
          <p class="meta"><span class="tag">${esc(catsById[w.category].name)}</span>${esc(schoolsById[w.school].name.replace(/ · .*/, ''))}</p>
        </span>
      </a>`;
}

/* ---------------- 首页 ---------------- */
function buildIndex() {
  const stepCards = steps.map((s, i) => `      <a class="card" href="craft.html#${esc(s.id)}" style="text-decoration:none;color:inherit">
        <span class="step-num">${CN_NUM[i]}</span>
        <h3>${esc(s.title.replace(/^. · /, ''))}</h3>
        <p>${esc(s.short)}</p>
      </a>`).join('\n');

  const featured = [worksById.feiyan, worksById['longtou-wugong'], worksById.banyao];
  const schoolChips = schools.slice(0, 5).map(sc =>
    `      <a class="card" href="schools.html#${esc(sc.id)}" style="text-decoration:none;color:inherit">
        <h3>${esc(sc.name)}</h3>
        <p>${esc(sc.feature)}</p>
      </a>`).join('\n');

  const body = `  <div class="wrap hero">
    <div>
      <h1>竹骨为身，纸绢为衣<br>一线牵风上青云</h1>
      <p class="lead">${esc(site.description)}本站按“扎、糊、绘、放”四步演示传统做法，并收录北京沙燕、天津软翅、潍坊串式、南通板鹞、岭南灵芝诸流派的代表作品。</p>
      <div class="hero-actions">
        <a class="btn" href="craft.html">逐步看扎糊绘放</a>
        <a class="btn ghost" href="gallery.html">进入作品图库</a>
      </div>
    </div>
    <figure class="hero-figure">
      <img src="assets/img/hero.svg" alt="三枚传统风筝——菱形纹鹞、黑翅沙燕与彩蝶——伴流云飞天，各牵一根细棉线。">
      <figcaption>风筝在南方称“鹞”、北方称“鸢”，相传始于春秋，盛于唐宋。</figcaption>
    </figure>
  </div>

  <section class="section wrap">
    <h2>四艺：扎、糊、绘、放</h2>
    <p class="sub">每一步都可单独点开查看材料、手法与子步骤。</p>
    <div class="grid cols-4">
${stepCards}
    </div>
  </section>

  <section class="section wrap">
    <h2>地域流派</h2>
    <p class="sub">南鹞北鸢，风土不同，形制各异。</p>
    <div class="grid cols-3">
${schoolChips}
    </div>
    <p style="margin-top:14px"><a href="schools.html">查看全部流派与代表作 →</a></p>
  </section>

  <section class="section wrap">
    <h2>精选作品</h2>
    <p class="sub">每件作品均标注寓意与制作周期，详见作品详情页。</p>
    <div class="grid cols-3">
${featured.map(w => workCard(w, '')).join('\n')}
    </div>
    <p style="margin-top:14px"><a href="gallery.html">进入完整图库并按造型筛选 →</a></p>
  </section>`;

  return page({ file: 'index.html', active: 'index.html', title: '首页', body });
}

/* ---------------- 扎糊绘放 ---------------- */
function buildCraft() {
  const jump = steps.map(s =>
    `    <a href="#${esc(s.id)}">${esc(s.title)}</a>`).join('\n');

  const blocks = steps.map((s, i) => {
    const points = s.points.map(t => `        <li>${esc(t)}</li>`).join('\n');
    const subs = s.substeps.map(sub =>
      `      <li><b>${esc(sub.title)}</b><span>${esc(sub.detail)}</span></li>`).join('\n');
    return `    <details id="${esc(s.id)}"${i === 0 ? ' open' : ''}>
      <summary><span class="step-num">${CN_NUM[i]}</span>${esc(s.title)}</summary>
      <div class="step-body">
        <div class="grid cols-2">
${figure(s, '')}
          <div>
            <h3 style="margin-top:4px">工艺要点</h3>
            <ul class="points">
${points}
            </ul>
          </div>
        </div>
        <ol class="substeps">
${subs}
        </ol>
      </div>
    </details>`;
  }).join('\n');

  const body = `  <div class="wrap">
    <nav class="crumbs"><a href="index.html">首页</a> / 扎糊绘放</nav>
  </div>
  <section class="section wrap step">
    <h2>扎 · 糊 · 绘 · 放：四步成鸢</h2>
    <p class="sub">点击每个步骤标题即可逐步展开；各步骤有固定锚点（如 <code>craft.html#paint</code>），可直接深链接。</p>
    <div class="step-jump">
${jump}
    </div>
${blocks}
    <noscript><p class="noscript-note">您已禁用脚本——本页步骤使用浏览器原生折叠能力，不受影响，可正常逐条点开。</p></noscript>
  </section>`;

  return page({ file: 'craft.html', active: 'craft.html', title: '骨架 · 糊纸 · 彩绘 · 试飞', body });
}

/* ---------------- 图库（:target 纯 CSS 筛选） ---------------- */
function galleryFilterStyle() {
  // 由 manifest 的分类在构建期生成；运行时零脚本
  const real = categories.map(c => `  body.page-gallery #filter-${esc(c.id)}:target ~ .work-grid .work-card { display: none; }
  body.page-gallery #filter-${esc(c.id)}:target ~ .work-grid .work-card[data-cat="${esc(c.id)}"] { display: block; }
  body.page-gallery #filter-${esc(c.id)}:target ~ .filter-bar a.all { background: var(--card); color: var(--ink-soft); border-color: var(--line); }
  body.page-gallery #filter-${esc(c.id)}:target ~ .filter-bar a[href="#filter-${esc(c.id)}"] { background: var(--cinnabar); border-color: var(--cinnabar-deep); color: #fff7e8; }`).join('\n');
  return `/* 构建期由 manifest 分类生成的无脚本筛选规则 */\n${real}\n`;
}

function buildGallery() {
  const anchor = c => `  <span class="filter-anchor" id="filter-${esc(c.id)}" tabindex="-1">当前筛选：${esc(c.name)}（${countByCat[c.id]} 件）。<a href="#all">清除筛选查看全部</a></span>`;
  const anchors = categories.map(anchor).join('\n');
  const pills = categories.map(c =>
    `      <a href="#filter-${esc(c.id)}">${esc(c.name)} (${countByCat[c.id]})</a>`).join('\n');

  const catLegend = categories.map(c =>
    `<li><b>${esc(c.name)}</b>：${esc(c.summary)}</li>`).join('\n');

  const cards = works.map(w => workCard(w, '')).join('\n');

  const body = `  <div class="wrap">
    <nav class="crumbs"><a href="index.html">首页</a> / 作品图库</nav>
  </div>
  <section class="section wrap page-gallery">
    <h2>作品图库</h2>
    <p class="sub">共 ${works.length} 件作品，按造型分类。筛选由纯 CSS 锚点完成，无需脚本，也可直接深链，例如 <code>gallery.html#filter-fish</code>。</p>
${anchors}
    <nav class="filter-bar" aria-label="按造型筛选作品">
      <a class="all" href="#all" aria-current="true">全部 (${works.length})</a>
${pills}
    </nav>
    <div class="work-grid grid cols-3">
${cards}
    </div>
    <h3 style="margin-top:28px">造型分类说明</h3>
    <ul class="points" style="columns:2">
${catLegend}
    </ul>
    <noscript><p class="noscript-note">筛选不依赖 JavaScript：每个分类都是一个页内锚点，点击即由浏览器原生定位与样式完成过滤；地址栏中的 <code>#filter-xxx</code> 可直接分享。</p></noscript>
  </section>`;

  return page({ file: 'gallery.html', active: 'gallery.html', title: '作品图库', body,
    extraHead: `<style>${galleryFilterStyle()}</style>` });
}

/* ---------------- 地域流派 ---------------- */
function buildSchools() {
  const cards = schools.map(sc => {
    const links = sc.works.map(id => {
      const w = worksById[id];
      return `        <a href="works/${esc(id)}.html">${esc(w.name)}</a>`;
    }).join('\n');
    return `    <article class="school" id="${esc(sc.id)}">
      <img src="${esc(sc.image)}" alt="${esc(sc.alt)}" loading="lazy">
      <div>
        <div class="region-tag">${esc(sc.region)}</div>
        <h3>${esc(sc.name)}</h3>
        <p><b>流派特点：</b>${esc(sc.feature)}</p>
        <p><b>常见题材：</b>${esc(sc.motifs)}</p>
        <p><b>本站代表作：</b></p>
        <p class="step-jump" style="margin:4px 0 0">
${links}
        </p>
      </div>
    </article>`;
  }).join('\n');

  const body = `  <div class="wrap">
    <nav class="crumbs"><a href="index.html">首页</a> / 地域流派</nav>
  </div>
  <section class="section wrap">
    <h2>地域流派：南鹞北鸢</h2>
    <p class="sub">中国风筝因地缘风土形成多个流派，以下五个流派各有固定锚点（如 <code>schools.html#nantong</code>）。</p>
${cards}
  </section>`;

  return page({ file: 'schools.html', active: 'schools.html', title: '地域流派', body });
}

/* ---------------- 作品详情 ---------------- */
function buildWork(w) {
  const cat = catsById[w.category];
  const sc = schoolsById[w.school];
  const body = `  <div class="wrap">
    <nav class="crumbs"><a href="../index.html">首页</a> / <a href="../gallery.html">作品图库</a> / ${esc(w.name)}</nav>
  </div>
  <article class="wrap detail">
    <figure class="shot">
      <img src="../${esc(w.image)}" alt="${esc(w.alt)}">
      <figcaption>${esc(w.alt)}</figcaption>
    </figure>
    <div>
      <h1>${esc(w.name)}</h1>
      <p class="meta-line">
        <span class="tag">${esc(cat.name)}</span>
        流派：<a href="../schools.html#${esc(sc.id)}">${esc(sc.name)}</a> ｜ 规格：${esc(w.size)}
      </p>
      <p>${esc(w.summary)}</p>
      <dl>
        <dt>寓意</dt>
        <dd>${esc(w.meaning)}</dd>
        <dt>制作周期</dt>
        <dd>${esc(w.cycle)}</dd>
        <dt>所属造型</dt>
        <dd><a href="../gallery.html#filter-${esc(cat.id)}">${esc(cat.name)}</a>——${esc(cat.summary)}</dd>
      </dl>
      <p style="margin-top:22px"><a href="../gallery.html#filter-${esc(cat.id)}">← 返回“${esc(cat.name)}”类作品</a> ｜ <a href="../gallery.html">回到全部作品</a></p>
    </div>
  </article>`;

  return page({ file: `works/${w.id}.html`, active: 'gallery.html', prefix: '../',
    title: w.name, description: `${w.name}：${w.meaning}`, body });
}

/* ---------------- 执行 ---------------- */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'works'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'data'), { recursive: true });

const pages = [
  ['index.html', buildIndex()],
  ['craft.html', buildCraft()],
  ['gallery.html', buildGallery()],
  ['schools.html', buildSchools()],
  ...works.map(w => [`works/${w.id}.html`, buildWork(w)]),
];
for (const [file, html] of pages) {
  fs.writeFileSync(path.join(DIST, file), html, 'utf8');
}
fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'data/manifest.json'), path.join(DIST, 'data/manifest.json'));

console.log(`构建完成：v${site.version}，${pages.length} 个页面 -> dist/`);
