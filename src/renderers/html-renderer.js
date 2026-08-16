/**
 * Interactive Single-Page HTML Viewer
 * Self-contained HTML application with pan/zoom canvas, search/filter, schema metrics, and instant export tools.
 * Pure Node.js - Zero dependencies.
 */

const SVGRenderer = require('./svg-renderer');

class HTMLRenderer {
    static generateHTML(schemaMap, options = {}) {
        const title = options.title || 'Database Schema Explorer';
        const rawSvg = SVGRenderer.generateSVG(schemaMap, { ...options, theme: 'catppuccin' });
        const tables = Object.keys(schemaMap);
        const totalCols = tables.reduce((acc, t) => acc + schemaMap[t].columns.length, 0);
        const totalRels = tables.reduce((acc, t) => acc + schemaMap[t].relations.length, 0);

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - schemagraph-core</title>
  <style>
    :root {
      --bg: #11111b;
      --surface: #181825;
      --card: #1e1e2e;
      --border: #313244;
      --text: #cdd6f4;
      --text-muted: #a6adc8;
      --primary: #89b4fa;
      --accent: #f38ba8;
      --success: #a6e3a1;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Top Navigation */
    header {
      height: 60px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-badge {
      background: linear-gradient(135deg, #89b4fa, #cba6f7);
      color: #11111b;
      font-weight: 900;
      font-size: 14px;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: -0.5px;
    }

    .title-group h1 {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .title-group p {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Center Search Bar */
    .search-box {
      position: relative;
      width: 320px;
    }

    .search-box input {
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 14px 8px 34px;
      color: var(--text);
      font-size: 13px;
      outline: none;
      transition: all 0.2s;
    }

    .search-box input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.2);
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 14px;
      pointer-events: none;
    }

    /* Actions & Controls */
    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    button {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    button:hover {
      background: var(--border);
      color: #fff;
    }

    .btn-primary {
      background: #89b4fa;
      color: #11111b;
      border: none;
    }

    .btn-primary:hover {
      background: #b4befe;
      color: #11111b;
    }

    /* Main Workspace */
    .workspace {
      display: flex;
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    /* Sidebar Drawer */
    aside {
      width: 280px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      z-index: 5;
    }

    .stats-card {
      padding: 16px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      border-bottom: 1px solid var(--border);
    }

    .stat-item {
      background: var(--card);
      padding: 10px 8px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid var(--border);
    }

    .stat-val {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-lbl {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 2px;
    }

    .table-list {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .table-item {
      padding: 10px 12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.15s;
    }

    .table-item:hover {
      border-color: var(--primary);
      transform: translateX(2px);
    }

    .table-item-name {
      font-size: 13px;
      font-weight: 600;
    }

    .table-item-count {
      font-size: 11px;
      color: var(--text-muted);
      background: var(--surface);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Canvas Stage */
    #viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
      background: #181825;
    }

    #viewport:active {
      cursor: grabbing;
    }

    #canvas-container {
      transform-origin: 0 0;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    /* Floating Zoom HUD */
    .zoom-hud {
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 4px;
      gap: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }

    .zoom-hud button {
      padding: 6px 10px;
      font-size: 14px;
    }

    .toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #a6e3a1;
      color: #11111b;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 13px;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 99;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo-badge">ERD</div>
      <div class="title-group">
        <h1>${title}</h1>
        <p>Zero-Dependency Relational Schema Explorer</p>
      </div>
    </div>

    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="search-input" placeholder="Search tables or columns..." onkeyup="filterTables()">
    </div>

    <div class="controls">
      <button onclick="resetZoom()">⟲ Reset</button>
      <button onclick="exportSVG()" class="btn-primary">⬇ Export SVG</button>
      <button onclick="exportPNG()">📷 PNG</button>
    </div>
  </header>

  <div class="workspace">
    <aside>
      <div class="stats-card">
        <div class="stat-item">
          <div class="stat-val">${tables.length}</div>
          <div class="stat-lbl">Models</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">${totalCols}</div>
          <div class="stat-lbl">Columns</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">${totalRels}</div>
          <div class="stat-lbl">Relations</div>
        </div>
      </div>

      <div class="table-list" id="table-list">
        ${tables.map(t => `
          <div class="table-item" data-table="${t.toLowerCase()}">
            <span class="table-item-name">${t}</span>
            <span class="table-item-count">${schemaMap[t].columns.length} cols</span>
          </div>
        `).join('')}
      </div>
    </aside>

    <main id="viewport">
      <div id="canvas-container">
        ${rawSvg}
      </div>

      <div class="zoom-hud">
        <button onclick="zoomBy(0.15)">＋</button>
        <button onclick="zoomBy(-0.15)">－</button>
        <button onclick="resetZoom()">100%</button>
      </div>
    </main>
  </div>

  <div id="toast" class="toast">Downloaded successfully!</div>

  <script>
    let scale = 1;
    let pointX = 0;
    let pointY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const viewport = document.getElementById('viewport');
    const container = document.getElementById('canvas-container');

    function updateTransform() {
      container.style.transform = \`translate(\${pointX}px, \${pointY}px) scale(\${scale})\`;
    }

    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.zoom-hud')) return;
      isDragging = true;
      startX = e.clientX - pointX;
      startY = e.clientY - pointY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      pointX = e.clientX - startX;
      pointY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const xs = (e.clientX - pointX) / scale;
      const ys = (e.clientY - pointY) / scale;
      const delta = -e.deltaY;
      (delta > 0) ? (scale *= 1.1) : (scale /= 1.1);
      scale = Math.min(Math.max(0.2, scale), 4);
      pointX = e.clientX - xs * scale;
      pointY = e.clientY - ys * scale;
      updateTransform();
    });

    function zoomBy(delta) {
      scale = Math.min(Math.max(0.2, scale + delta), 4);
      updateTransform();
    }

    function resetZoom() {
      scale = 1;
      pointX = 0;
      pointY = 0;
      updateTransform();
    }

    function filterTables() {
      const q = document.getElementById('search-input').value.toLowerCase();
      const items = document.querySelectorAll('.table-item');
      items.forEach(item => {
        const name = item.getAttribute('data-table');
        item.style.display = name.includes(q) ? 'flex' : 'none';
      });

      const cards = document.querySelectorAll('.table-card');
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.opacity = !q || text.includes(q) ? '1' : '0.15';
      });
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    }

    function exportSVG() {
      const svg = document.querySelector('svg').outerHTML;
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database-schema.svg';
      a.click();
      showToast('✅ SVG Diagram downloaded!');
    }

    function exportPNG() {
      const svgElement = document.querySelector('svg');
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgElement.viewBox.baseVal.width || 1200;
        canvas.height = svgElement.viewBox.baseVal.height || 900;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const pngURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngURL;
        a.download = 'database-schema.png';
        a.click();
        showToast('✅ PNG Image downloaded!');
      };
      image.src = blobURL;
    }
  </script>
</body>
</html>`;
    }
}

module.exports = HTMLRenderer;
