#!/usr/bin/env node
/**
 * 构建产物校验：
 *  1) 所有相对路径（href/src）在 dist 内均有对应文件
 *  2) 所有页内/跨页 #fragment 锚点在目标页面中存在
 *  3) 每页 version/generator/manifest-source 元数据与 manifest 一致
 *  4) 所有 <img> 均带非空 alt
 * 校验失败则以非零状态退出。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/manifest.json'), 'utf8'));

const errors = [];
const warn = [];
const fail = msg => errors.push(msg);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? walk(full) : [full];
  });
}

const htmlFiles = walk(DIST).filter(f => f.endsWith('.html'));
const relOf = f => path.relative(DIST, f).split(path.sep).join('/');

/* 收集每个页面的全部 id（锚点目标） */
const idsByPage = new Map();
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const ids = new Set([...html.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map(m => m[1]));
  ids.add('all'); // 图库“清除筛选”锚点（:not(:target) 的默认状态）
  idsByPage.set(relOf(f), ids);
}

/* manifest 中声明的全部图片资源，用于反向核对 */
const declaredAssets = new Set();
const collect = v => {
  if (typeof v === 'string' && /\.(svg|png|jpe?g|webp|gif)$/.test(v)) declaredAssets.add(v);
  if (Array.isArray(v)) v.forEach(collect);
  if (v && typeof v === 'object') Object.values(v).forEach(collect);
};
collect(manifest);

const referencedAssets = new Set();
const ATTR = /(?:href|src)\s*=\s*"([^"]+)"/g;

for (const f of htmlFiles) {
  const rel = relOf(f);
  const pageDir = path.dirname(f);
  const html = fs.readFileSync(f, 'utf8');

  /* 1) 版本元数据 */
  const mv = html.match(/<meta\s+name="site-version"\s+content="([^"]+)"/);
  if (!mv) fail(`${rel}: 缺少 <meta name="site-version">`);
  else if (mv[1] !== manifest.site.version) fail(`${rel}: 版本为 ${mv[1]}，manifest 为 ${manifest.site.version}`);

  const mg = html.match(/<meta\s+name="generator"\s+content="([^"]+)"/);
  if (!mg) fail(`${rel}: 缺少 generator 元数据`);
  else if (mg[1] !== manifest.site.generator) fail(`${rel}: generator 不一致 (${mg[1]})`);

  const ms = html.match(/<meta\s+name="manifest-source"\s+content="([^"]+)"/);
  if (!ms) fail(`${rel}: 缺少 manifest-source 元数据`);
  else if (ms[1] !== manifest.site.dataFile) fail(`${rel}: manifest-source 不一致`);

  /* 4) img 必须有非空 alt */
  const imgTags = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  for (const tag of imgTags) {
    const alt = tag.match(/\balt\s*=\s*"([^"]*)"/);
    if (!alt) fail(`${rel}: <img> 缺少 alt：${tag.slice(0, 80)}`);
    else if (alt[1].trim().length < 8) fail(`${rel}: alt 说明过短（应描述画面）：${alt[1]}`);
  }

  /* 2)+3) 相对路径与锚点 */
  for (const m of html.matchAll(ATTR)) {
    let url = m[1];
    if (/^(https?:)?\/\//.test(url) || url.startsWith('mailto:') || url.startsWith('data:')) continue;

    const [rawPath, frag] = url.split('#');
    let targetFile;

    if (rawPath === '') {
      targetFile = f; // 纯页内锚点
    } else {
      const resolved = path.normalize(path.join(pageDir, rawPath));
      if (!resolved.startsWith(DIST)) { fail(`${rel}: 路径越出站点目录: ${url}`); continue; }
      if (/\.(svg|png|jpe?g|webp|gif|css|json)$/.test(rawPath)) {
        referencedAssets.add(path.relative(DIST, resolved).split(path.sep).join('/'));
      }
      if (!fs.existsSync(resolved)) { fail(`${rel}: 引用了不存在的文件: ${url}`); continue; }
      if (resolved.endsWith('.html')) targetFile = resolved;
    }

    if (frag !== undefined && targetFile && targetFile.endsWith('.html')) {
      const targetRel = relOf(targetFile);
      const ids = idsByPage.get(targetRel);
      if (!ids.has(frag)) fail(`${rel}: 锚点不存在 -> ${targetRel}#${frag}`);
    }
  }
}

/* 反向核对 manifest 声明的图片确实存在且被页面引用（favicon 除外，它在每页都被引用） */
for (const a of declaredAssets) {
  const inDist = path.join(DIST, a);
  if (!fs.existsSync(inDist)) fail(`manifest 声明的资源在产物中缺失: ${a}`);
  if (!referencedAssets.has(a) && a !== 'assets/img/favicon.svg') {
    warn(`manifest 资源未被任何页面引用: ${a}`);
  }
}

/* data/manifest.json 应随产物发布（file:// 下可核对数据来源） */
if (!fs.existsSync(path.join(DIST, 'data/manifest.json'))) fail('dist/data/manifest.json 缺失');

console.log(`校验页面 ${htmlFiles.length} 个，引用资源 ${referencedAssets.size} 个，声明资源 ${declaredAssets.size} 个`);
for (const w of warn) console.warn('  [warn] ' + w);
if (errors.length) {
  console.error(`\n校验失败，共 ${errors.length} 项：`);
  for (const e of errors) console.error('  [FAIL] ' + e);
  process.exit(1);
}
console.log('全部校验通过：相对路径、锚点、版本元数据均一致 ✓');
