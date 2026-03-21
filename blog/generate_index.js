#!/usr/bin/env node
/**
 * blog/generate_index.js
 * blog/ 内の記事 HTML をスキャンして blog/index.html を自動生成します。
 * 外部パッケージ不要（Node.js 標準モジュールのみ使用）
 *
 * 使い方:
 *   node blog/generate_index.js
 */

const fs   = require("fs");
const path = require("path");

// ── 設定 ──────────────────────────────────────────────────────────────────────

const BLOG_DIR    = __dirname;                        // このスクリプトと同じ blog/
const OUTPUT_FILE = path.join(BLOG_DIR, "index.html");

const EXCLUDE_FILES  = new Set(["index.html", "template.html", "generate_index.js"]);
const ADSENSE_CLIENT = "ca-pub-7073636277654421";
const ADSENSE_SLOT   = "XXXXXXXXXX"; // 審査通過後に実際のスロットIDに差し替えてください

// ── HTML パーサー（正規表現）─────────────────────────────────────────────────

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  if (!m) return "";
  return m[1].trim().replace(/\s*\|\s*usetool\.net\s*$/i, "");
}

function extractMeta(html, name) {
  // <meta name="..." content="..."> or <meta property="..." content="...">
  const p1 = new RegExp(`<meta\\s+(?:name|property)="${escapeRe(name)}"\\s+content="([^"]*)"`, "i");
  const p2 = new RegExp(`<meta\\s+content="([^"]*)"\\s+(?:name|property)="${escapeRe(name)}"`, "i");
  const m = html.match(p1) || html.match(p2);
  return m ? m[1].trim() : "";
}

function extractDateISO(html) {
  const m = html.match(/<time\s+datetime="([^"]+)"/i);
  if (m) return m[1].trim();
  return extractMeta(html, "article:published_time");
}

function extractDateDisplay(html) {
  const m = html.match(/<time[^>]*>([^<]+)<\/time>/i);
  return m ? m[1].trim() : "";
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── 日付パース（ソート用）────────────────────────────────────────────────────

function parseDateForSort(isoStr) {
  if (!isoStr) return new Date(0);
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

// ── 記事パース ────────────────────────────────────────────────────────────────

function parseArticle(filePath) {
  let html;
  try {
    html = fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    console.log(`  [SKIP] ${path.basename(filePath)}: 読み込みエラー (${e.message})`);
    return null;
  }

  const title = extractTitle(html);
  if (!title || title.includes("{{")) {
    console.log(`  [SKIP] ${path.basename(filePath)}: タイトルが未設定（テンプレートのまま）`);
    return null;
  }

  const description  = extractMeta(html, "description") || "（説明なし）";
  const dateISO      = extractDateISO(html);
  const dateDisplay  = extractDateDisplay(html) || dateISO || "日付不明";
  const fileName     = path.basename(filePath);

  return {
    file:        fileName,
    title,
    description,
    dateISO,
    dateDisplay,
    dateSort:    parseDateForSort(dateISO),
  };
}

// ── 記事スキャン ──────────────────────────────────────────────────────────────

function scanArticles() {
  const files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith(".html") && !EXCLUDE_FILES.has(f))
    .map(f => path.join(BLOG_DIR, f));

  const articles = [];
  for (const filePath of files) {
    console.log(`  [SCAN] ${path.basename(filePath)}`);
    const article = parseArticle(filePath);
    if (article) {
      articles.push(article);
      console.log(`         → ${article.title.slice(0, 50)}`);
    }
  }

  // 新着順（日付降順）
  articles.sort((a, b) => b.dateSort - a.dateSort);
  return articles;
}

// ── HTML 生成パーツ ───────────────────────────────────────────────────────────

function renderAdUnit() {
  return `\
      <div class="ad-wrap">
        <span class="ad-label">広告</span>
        <div class="ad-unit">
          <ins class="adsbygoogle"
               style="display:block"
               data-ad-client="${ADSENSE_CLIENT}"
               data-ad-slot="${ADSENSE_SLOT}"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
          <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        </div>
      </div>`;
}

function renderArticleCard(article) {
  return `\
        <a href="/blog/${article.file}" class="article-card">
          <div class="article-date">${escapeHtml(article.dateDisplay)}</div>
          <h2 class="article-title">${escapeHtml(article.title)}</h2>
          <p class="article-desc">${escapeHtml(article.description)}</p>
          <span class="article-arrow">続きを読む →</span>
        </a>`;
}

function renderArticleList(articles) {
  if (articles.length === 0) {
    return `        <div class="empty-state"><p>まだ記事がありません。</p></div>`;
  }

  const parts = [];
  articles.forEach((article, i) => {
    parts.push(renderArticleCard(article));
    // 3件ごとに広告を挿入（最後の後は除く）
    if ((i + 1) % 3 === 0 && (i + 1) < articles.length) {
      parts.push(renderAdUnit());
    }
  });
  return parts.join("\n");
}

// ── index.html 生成 ───────────────────────────────────────────────────────────

function generateHTML(articles) {
  const now   = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const count = articles.length;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}"
     crossorigin="anonymous"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ブログ | usetool.net</title>
  <meta name="description" content="usetool.net の使い方・ヒント・最新情報をお届けするブログです。">
  <link rel="canonical" href="https://usetool.net/blog/">

  <!-- OGP -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="ブログ | usetool.net">
  <meta property="og:description" content="usetool.net の使い方・ヒント・最新情報をお届けするブログです。">
  <meta property="og:url" content="https://usetool.net/blog/">
  <meta property="og:site_name" content="usetool.net">
  <meta property="og:locale" content="ja_JP">

  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      min-height: 100vh;
      padding: 24px 16px 48px;
    }

    .container {
      max-width: 760px;
      margin: 0 auto;
    }

    /* ── Site Nav ─────────────────────────── */
    .site-nav {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .site-nav a {
      font-size: 0.85rem;
      color: #6e6e73;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 20px;
      transition: background 0.15s, color 0.15s;
    }

    .site-nav a:hover {
      background: #e5e5ea;
      color: #1d1d1f;
    }

    .site-nav a.active {
      background: #0071e3;
      color: #fff;
      font-weight: 600;
    }

    /* ── Header ───────────────────────────── */
    header {
      text-align: center;
      margin-bottom: 32px;
    }

    header h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: #6e6e73;
      font-size: 0.9rem;
      margin-top: 6px;
    }

    /* ── Ad Unit ──────────────────────────── */
    .ad-wrap {
      margin: 20px 0;
    }

    .ad-label {
      display: block;
      font-size: 0.68rem;
      color: #aeaeb2;
      text-align: center;
      margin-bottom: 4px;
      letter-spacing: 0.05em;
    }

    .ad-unit {
      background: #f0f0f2;
      border-radius: 10px;
      padding: 8px;
      min-height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Article Count ────────────────────── */
    .article-count {
      font-size: 0.8rem;
      color: #8e8e93;
      text-align: right;
      margin-bottom: 12px;
    }

    /* ── Article Cards ────────────────────── */
    .article-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .article-card {
      display: block;
      background: #fff;
      border-radius: 16px;
      padding: 24px 28px;
      text-decoration: none;
      color: inherit;
      transition: box-shadow 0.15s, transform 0.15s;
    }

    .article-card:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      transform: translateY(-1px);
    }

    .article-date {
      font-size: 0.78rem;
      color: #8e8e93;
      margin-bottom: 8px;
    }

    .article-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1d1d1f;
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .article-desc {
      font-size: 0.875rem;
      color: #6e6e73;
      line-height: 1.6;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .article-arrow {
      font-size: 0.8rem;
      color: #0071e3;
      font-weight: 500;
    }

    /* ── Empty State ──────────────────────── */
    .empty-state {
      background: #fff;
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      color: #8e8e93;
      font-size: 0.9rem;
    }

    /* ── Footer ───────────────────────────── */
    footer {
      text-align: center;
      padding-top: 16px;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .footer-links a {
      font-size: 0.8rem;
      color: #8e8e93;
      text-decoration: none;
    }

    .footer-links a:hover {
      color: #0071e3;
    }

    .footer-copy {
      font-size: 0.75rem;
      color: #aeaeb2;
    }

    .generated-at {
      font-size: 0.7rem;
      color: #c7c7cc;
      margin-top: 6px;
    }

    /* ── Responsive ───────────────────────── */
    @media (max-width: 640px) {
      header h1 {
        font-size: 1.6rem;
      }

      .article-card {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">

    <nav class="site-nav">
      <a href="/">画像・PDF圧縮</a>
      <a href="/webp/">WebP変換</a>
      <a href="/contact.html">お問い合わせ</a>
    </nav>

    <header>
      <h1>ブログ</h1>
      <p class="subtitle">使い方・ヒント・最新情報</p>
    </header>

    <!-- 広告：一覧上部 -->
${renderAdUnit()}

    <!-- 記事一覧 -->
    <p class="article-count">${count} 件の記事</p>
    <div class="article-list">
${renderArticleList(articles)}
    </div>

    <!-- 広告：一覧下部 -->
${renderAdUnit()}

    <!-- フッター -->
    <footer>
      <nav class="footer-links">
        <a href="/">ホーム</a>
        <a href="/blog/">ブログ</a>
        <a href="/privacy.html">プライバシーポリシー</a>
        <a href="/contact.html">お問い合わせ</a>
      </nav>
      <p class="footer-copy">&copy; 2024 usetool.net</p>
      <p class="generated-at">generated: ${now}</p>
    </footer>

  </div>
</body>
</html>
`;
}

// ── エントリーポイント ─────────────────────────────────────────────────────────

console.log("=== blog/generate_index.js ===");
console.log(`スキャン対象: ${BLOG_DIR}`);
console.log();

const articles = scanArticles();

console.log();
console.log(`記事数: ${articles.length} 件`);

const html = generateHTML(articles);
fs.writeFileSync(OUTPUT_FILE, html, "utf-8");

console.log(`生成完了: ${OUTPUT_FILE}`);
