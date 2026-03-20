// ── PDF.js ワーカー設定 ──────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── DOM 要素の取得 ─────────────────────────
const uploadArea      = document.getElementById('uploadArea');
const fileInput       = document.getElementById('fileInput');
const mainPanel       = document.getElementById('mainPanel');
const imageSettings   = document.getElementById('imageSettings');
const pdfSettings     = document.getElementById('pdfSettings');
const qualitySlider   = document.getElementById('qualitySlider');
const qualityValue    = document.getElementById('qualityValue');
const qualityGroup    = document.getElementById('qualityGroup');
const maxWidthInput   = document.getElementById('maxWidth');
const maxHeightInput  = document.getElementById('maxHeight');
const pdfQualitySlider= document.getElementById('pdfQualitySlider');
const pdfQualityValue = document.getElementById('pdfQualityValue');
const progressArea    = document.getElementById('progressArea');
const progressBar     = document.getElementById('progressBar');
const progressLabel   = document.getElementById('progressLabel');
const compressBtn     = document.getElementById('compressBtn');
const downloadArea    = document.getElementById('downloadArea');
const downloadBtn     = document.getElementById('downloadBtn');

const originalPreview     = document.getElementById('originalPreview');
const compressedPreview   = document.getElementById('compressedPreview');
const previewPlaceholder  = document.getElementById('previewPlaceholder');
const originalSize        = document.getElementById('originalSize');
const originalDimensions  = document.getElementById('originalDimensions');
const pdfPageCount        = document.getElementById('pdfPageCount');
const compressedSize      = document.getElementById('compressedSize');
const compressedDimensions= document.getElementById('compressedDimensions');
const reductionRate       = document.getElementById('reductionRate');

const formatBtns = document.querySelectorAll('.format-btn');
const dpiButtons = document.querySelectorAll('.dpi-btn');

// ── 状態管理 ────────────────────────────────
let originalFile   = null;   // File オブジェクト
let originalImage  = null;   // Image オブジェクト（画像モードのみ）
let outputFormat   = 'image/jpeg';
let compressedBlob = null;
let currentMode    = 'image'; // 'image' | 'pdf'
let pdfDocument    = null;   // PDF.js PDFDocumentProxy
let selectedDpi    = 150;    // PDF 圧縮時の DPI

// ── ファイルアップロード ─────────────────────

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// ── ファイル種別判定 & 共通リセット ────────────

function handleFile(file) {
  // 共通状態リセット
  compressedBlob = null;
  pdfDocument    = null;
  downloadArea.hidden = true;
  compressedPreview.src = '';
  previewPlaceholder.style.display = 'flex';
  compressedSize.textContent = '-';
  compressedDimensions.textContent = '-';
  reductionRate.textContent = '';
  reductionRate.style.background = '';
  reductionRate.style.color = '';
  progressArea.hidden = true;
  progressBar.style.width = '0%';
  pdfPageCount.hidden = true;

  if (file.type === 'application/pdf') {
    currentMode = 'pdf';
    imageSettings.hidden = true;
    pdfSettings.hidden   = false;
    handlePDF(file);
  } else if (file.type.match(/image\/(jpeg|png)/)) {
    currentMode = 'image';
    imageSettings.hidden = false;
    pdfSettings.hidden   = true;
    handleImage(file);
  } else {
    alert('JPEG・PNG・PDF ファイルを選択してください。');
  }
}

// ── 画像処理 ────────────────────────────────

function handleImage(file) {
  originalFile  = file;
  originalImage = null;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      originalPreview.src = e.target.result;
      originalSize.textContent = formatBytes(file.size);
      originalDimensions.textContent = `${img.width} × ${img.height} px`;
      maxWidthInput.placeholder  = img.width;
      maxHeightInput.placeholder = img.height;
      mainPanel.hidden = false;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── PDF 処理 ────────────────────────────────

async function handlePDF(file) {
  originalFile  = file;
  originalImage = null;

  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDocument = await loadingTask.promise;

    const numPages = pdfDocument.numPages;
    originalSize.textContent = formatBytes(file.size);
    pdfPageCount.textContent = `${numPages} ページ`;
    pdfPageCount.hidden = false;

    // 1ページ目のサイズ取得
    const page     = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    originalDimensions.textContent =
      `${Math.round(viewport.width)} × ${Math.round(viewport.height)} pt`;

    // 1ページ目をサムネイル描画
    const thumbScale  = Math.min(1.0, 400 / viewport.width);
    const thumbVP     = page.getViewport({ scale: thumbScale });
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width  = thumbVP.width;
    thumbCanvas.height = thumbVP.height;

    await page.render({
      canvasContext: thumbCanvas.getContext('2d'),
      viewport: thumbVP
    }).promise;

    originalPreview.src = thumbCanvas.toDataURL('image/jpeg', 0.85);
    thumbCanvas.width = 1; thumbCanvas.height = 1;

    mainPanel.hidden = false;

  } catch (err) {
    alert('PDFの読み込みに失敗しました。ファイルが破損しているか、暗号化されている可能性があります。');
    console.error(err);
  }
}

// ── 出力形式の切替（画像モード） ───────────────

formatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    formatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    outputFormat = btn.dataset.format;
    qualityGroup.style.opacity  = outputFormat === 'image/png' ? '0.4' : '1';
    qualitySlider.disabled = outputFormat === 'image/png';
  });
});

// ── 品質スライダー（画像モード） ──────────────

qualitySlider.addEventListener('input', () => {
  qualityValue.textContent = qualitySlider.value;
});

// ── DPI ボタン（PDFモード） ───────────────────

dpiButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    dpiButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDpi = parseInt(btn.dataset.dpi);
  });
});

// ── PDF 品質スライダー ────────────────────────

pdfQualitySlider.addEventListener('input', () => {
  pdfQualityValue.textContent = pdfQualitySlider.value;
});

// ── 圧縮ボタン ───────────────────────────────

compressBtn.addEventListener('click', () => {
  if (currentMode === 'pdf') {
    if (!pdfDocument) return;
    compressPDF();
  } else {
    if (!originalImage) return;
    compressImage();
  }
});

// ── 画像圧縮 ────────────────────────────────

function compressImage() {
  const quality = parseInt(qualitySlider.value) / 100;
  const maxW    = parseInt(maxWidthInput.value)  || null;
  const maxH    = parseInt(maxHeightInput.value) || null;
  const { width, height } = calcSize(
    originalImage.width, originalImage.height, maxW, maxH
  );

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(originalImage, 0, 0, width, height);

  canvas.toBlob((blob) => {
    if (!blob) return;
    compressedBlob = blob;

    const url = URL.createObjectURL(blob);
    compressedPreview.src = url;
    previewPlaceholder.style.display = 'none';
    compressedSize.textContent = formatBytes(blob.size);
    compressedDimensions.textContent = `${width} × ${height} px`;

    const rate = ((1 - blob.size / originalFile.size) * 100).toFixed(1);
    updateReductionBadge(rate);

    downloadArea.hidden = false;
  }, outputFormat, quality);
}

// ── PDF 圧縮 ────────────────────────────────

async function compressPDF() {
  const numPages = pdfDocument.numPages;
  const quality  = parseInt(pdfQualitySlider.value) / 100;
  const scale    = selectedDpi / 72; // PDF ユーザー空間は 72pt/inch

  // UI を処理中状態に
  compressBtn.disabled = true;
  progressArea.hidden  = false;
  downloadArea.hidden  = true;

  // jsPDF のドキュメントをページ1のサイズで初期化
  const firstPage  = await pdfDocument.getPage(1);
  const firstVP    = firstPage.getViewport({ scale: 1.0 });
  const { jsPDF }  = window.jspdf;
  const doc        = new jsPDF({
    orientation: firstVP.width > firstVP.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [firstVP.width, firstVP.height]
  });

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    // プログレスバー更新
    const pct = Math.round(((pageNum - 1) / numPages) * 100);
    progressBar.style.width  = `${pct}%`;
    progressLabel.textContent = `処理中... ${pageNum - 1} / ${numPages} ページ`;

    // ブラウザに描画を渡す（UIが固まらないように）
    await new Promise(resolve => setTimeout(resolve, 0));

    const page     = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas   = document.createElement('canvas');
    canvas.width   = Math.round(viewport.width);
    canvas.height  = Math.round(viewport.height);

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport
    }).promise;

    const imgData = canvas.toDataURL('image/jpeg', quality);

    // 2ページ目以降は新規ページを追加（ページごとの正しいサイズで）
    if (pageNum > 1) {
      const pageVP = page.getViewport({ scale: 1.0 });
      doc.addPage(
        [pageVP.width, pageVP.height],
        pageVP.width > pageVP.height ? 'landscape' : 'portrait'
      );
    }

    // ページ全体に画像を貼り付け（元の pt サイズで）
    const pageVP = page.getViewport({ scale: 1.0 });
    doc.addImage(imgData, 'JPEG', 0, 0, pageVP.width, pageVP.height);

    // Canvas を即座に解放してメモリ節約
    canvas.width = 1; canvas.height = 1;
  }

  // 完了
  progressBar.style.width   = '100%';
  progressLabel.textContent = `完了 ${numPages} / ${numPages} ページ`;

  // Blob 生成
  const pdfBuffer = doc.output('arraybuffer');
  compressedBlob  = new Blob([pdfBuffer], { type: 'application/pdf' });

  // 変換後プレビュー（1ページ目サムネイル）
  try {
    const outTask   = pdfjsLib.getDocument({ data: await compressedBlob.arrayBuffer() });
    const outDoc    = await outTask.promise;
    const outPage   = await outDoc.getPage(1);
    const outVPBase = outPage.getViewport({ scale: 1.0 });
    const outScale  = Math.min(1.0, 400 / outVPBase.width);
    const outVP     = outPage.getViewport({ scale: outScale });
    const outCanvas = document.createElement('canvas');
    outCanvas.width  = outVP.width;
    outCanvas.height = outVP.height;
    await outPage.render({
      canvasContext: outCanvas.getContext('2d'),
      viewport: outVP
    }).promise;
    compressedPreview.src = outCanvas.toDataURL('image/jpeg', 0.85);
    outCanvas.width = 1; outCanvas.height = 1;
  } catch (e) {
    // サムネイル生成失敗でもダウンロードは続行
    console.warn('After-thumbnail failed:', e);
  }

  previewPlaceholder.style.display = 'none';
  compressedSize.textContent = formatBytes(compressedBlob.size);
  compressedDimensions.textContent = `${numPages} ページ`;

  const rate = ((1 - compressedBlob.size / originalFile.size) * 100).toFixed(1);
  updateReductionBadge(rate);

  downloadArea.hidden  = false;
  compressBtn.disabled = false;
}

// ── ダウンロード ────────────────────────────

downloadBtn.addEventListener('click', () => {
  if (!compressedBlob) return;

  const base = (originalFile.name || 'file').replace(/\.[^.]+$/, '');
  let name;

  if (currentMode === 'pdf') {
    name = `${base}_compressed.pdf`;
  } else {
    const ext = outputFormat === 'image/jpeg' ? 'jpg' : 'png';
    name = `${base}_compressed.${ext}`;
  }

  const url = URL.createObjectURL(compressedBlob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ── ユーティリティ ──────────────────────────

function updateReductionBadge(rate) {
  if (rate > 0) {
    reductionRate.textContent  = `▼ ${rate}% 削減`;
    reductionRate.style.background = '';
    reductionRate.style.color      = '';
  } else {
    reductionRate.textContent  = `▲ ${Math.abs(rate)}% 増加`;
    reductionRate.style.background = '#fee2e2';
    reductionRate.style.color      = '#991b1b';
  }
}

/**
 * アスペクト比を維持しながら maxW / maxH に収まるサイズを返す
 */
function calcSize(origW, origH, maxW, maxH) {
  let w = origW;
  let h = origH;

  if (maxW && w > maxW) {
    h = Math.round((h * maxW) / w);
    w = maxW;
  }
  if (maxH && h > maxH) {
    w = Math.round((w * maxH) / h);
    h = maxH;
  }

  return { width: w, height: h };
}

/**
 * バイト数を KB / MB に変換して表示
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
