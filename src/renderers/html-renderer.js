/**
 * Interactive Single-Page HTML Viewer
 * Fully interactive visual ERD explorer with:
 * - Real-time draggable table cards with dynamic Bézier connector re-routing
 * - Compact Mode (Keys-only view for huge 50+ table databases) vs Detailed Full View
 * - "Fit to Screen" auto-scaling and centering
 * - Interactive Minimap radar navigator
 * - Left-sidebar Connection Inspector (Incoming & Outgoing relations with jump links)
 * - Sub-graph relationship highlighting & dimming
 * - Search filter, pan/zoom canvas, and instant PNG/SVG/JSON export tools.
 * Pure Node.js - Zero dependencies.
 */

const SVGRenderer = require('./svg-renderer');
const LayoutEngine = require('../layout/layout-engine');

class HTMLRenderer {
    static generateHTML(schemaMap, options = {}) {
        const title = options.title || 'Database Schema Explorer';
        const rawSvg = SVGRenderer.generateSVG(schemaMap, { ...options, theme: 'catppuccin' });
        const tables = Object.keys(schemaMap);
        const totalCols = tables.reduce((acc, t) => acc + schemaMap[t].columns.length, 0);
        const totalRels = tables.reduce((acc, t) => acc + schemaMap[t].relations.length, 0);

        // Precompute relations map for each table for instant client-side lookup
        const schemaMetadata = {};
        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            const outgoing = [];
            const incoming = [];

            table.relations.forEach(r => {
                outgoing.push({
                    fromField: r.from,
                    toTable: r.toTable,
                    toField: r.toField,
                    cardinality: r.cardinality || 'N:1'
                });
            });

            tables.forEach(otherName => {
                if (otherName === tableName) return;
                const otherTable = schemaMap[otherName];
                otherTable.relations.forEach(r => {
                    if (r.toTable === tableName) {
                        incoming.push({
                            fromTable: otherName,
                            fromField: r.from,
                            toField: r.toField,
                            cardinality: r.cardinality || 'N:1'
                        });
                    }
                });
            });

            schemaMetadata[tableName] = {
                name: tableName,
                sourceType: table.sourceType || 'TABLE',
                columns: table.columns,
                outgoing,
                incoming
            };
        });

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - schemagraph</title>
  <style>
    :root {
      --bg: #11111b;
      --surface: #181825;
      --card: #1e1e2e;
      --card-hover: #252538;
      --border: #313244;
      --border-bright: #45475a;
      --text: #cdd6f4;
      --text-muted: #a6adc8;
      --primary: #89b4fa;
      --accent: #f38ba8;
      --success: #a6e3a1;
      --purple: #cba6f7;
      --yellow: #f9e2af;
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

    /* Top Header */
    header {
      height: 60px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 20;
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
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .title-group p {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Search Box */
    .search-box {
      position: relative;
      width: 280px;
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
      box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.25);
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

    /* Action Buttons */
    .controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    button {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 11px;
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

    .btn-active {
      background: rgba(137, 180, 250, 0.2);
      border-color: var(--primary);
      color: var(--primary);
    }

    /* Main Workspace Layout */
    .workspace {
      display: flex;
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    /* Left Sidebar */
    aside {
      width: 320px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      z-index: 10;
    }

    .stats-card {
      padding: 12px 14px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      border-bottom: 1px solid var(--border);
      background: rgba(0,0,0,0.15);
    }

    .stat-item {
      background: var(--card);
      padding: 6px 4px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid var(--border);
    }

    .stat-val {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-lbl {
      font-size: 9.5px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Sidebar Tabs Header */
    .sidebar-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      border-radius: 0;
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      justify-content: center;
    }

    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      background: rgba(137, 180, 250, 0.05);
    }

    /* Table List View */
    .table-list {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .table-item {
      padding: 9px 12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.15s;
    }

    .table-item:hover, .table-item.selected {
      border-color: var(--primary);
      background: var(--card-hover);
      transform: translateX(3px);
    }

    .table-item-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }

    .table-item-count {
      font-size: 10.5px;
      color: var(--text-muted);
      background: var(--surface);
      padding: 2px 6px;
      border-radius: 10px;
    }

    /* Inspector View */
    #inspector-view {
      padding: 14px;
      display: none;
      flex-direction: column;
      gap: 14px;
    }

    .inspector-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }

    .inspector-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
    }

    .badge-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(137, 180, 250, 0.2);
      color: var(--primary);
    }

    .inspector-section-title {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .rel-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 6px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      transition: all 0.15s;
    }

    .rel-card:hover {
      border-color: var(--accent);
      background: var(--card-hover);
    }

    .rel-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .rel-target-btn {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--accent);
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
    }

    .rel-card-detail {
      font-family: var(--mono);
      font-size: 10.5px;
      color: var(--text-muted);
    }

    .cols-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-height: 240px;
      overflow-y: auto;
    }

    .col-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 8px;
      background: var(--card);
      border-radius: 4px;
      font-size: 11px;
    }

    .col-row-name {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: 500;
    }

    .pk-tag {
      font-size: 8.5px;
      font-weight: bold;
      background: var(--yellow);
      color: #11111b;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .fk-tag {
      font-size: 8.5px;
      font-weight: bold;
      background: var(--purple);
      color: #11111b;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .col-row-type {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-muted);
    }

    /* Canvas Stage */
    #viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: #181825;
      cursor: grab;
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

    /* SVG Table Cards & Connectors */
    .table-card {
      transition: filter 0.15s, opacity 0.2s;
    }

    .table-card:hover rect.card-bg {
      stroke: var(--primary) !important;
      stroke-width: 2px !important;
    }

    .table-card.selected rect.card-bg {
      stroke: #89b4fa !important;
      stroke-width: 3px !important;
    }

    .table-card.dragging {
      cursor: grabbing !important;
      filter: url(#cardSelectedGlow) !important;
    }

    .dimmed {
      opacity: 0.12 !important;
      transition: opacity 0.2s;
    }

    .rel-edge {
      transition: stroke 0.2s, stroke-width 0.2s, opacity 0.2s;
    }

    .rel-edge:hover, .rel-edge.highlighted {
      stroke: #89b4fa !important;
      stroke-width: 4px !important;
      stroke-dasharray: none !important;
      opacity: 1 !important;
      marker-end: url(#arrowHeadHighlight) !important;
    }

    .rel-anchor.highlighted {
      fill: #89b4fa !important;
      r: 6 !important;
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
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 15;
    }

    .zoom-hud button {
      padding: 6px 10px;
      font-size: 12px;
    }

    /* Interactive Minimap Radar */
    #minimap {
      position: absolute;
      bottom: 24px;
      left: 24px;
      width: 180px;
      height: 120px;
      background: rgba(24, 24, 37, 0.9);
      border: 1px solid var(--border-bright);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 15;
      overflow: hidden;
      cursor: pointer;
    }

    #minimap-canvas {
      width: 100%;
      height: 100%;
    }

    #minimap-box {
      position: absolute;
      border: 1.5px solid var(--primary);
      background: rgba(137, 180, 250, 0.15);
      pointer-events: none;
    }

    /* Floating Tooltip */
    #rel-tooltip {
      position: fixed;
      display: none;
      background: #1e1e2e;
      border: 1px solid var(--primary);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-family: var(--mono);
      pointer-events: none;
      z-index: 99;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    }

    .toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #a6e3a1;
      color: #11111b;
      padding: 9px 18px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 12px;
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
        <p>Interactive Draggable Relational Schema Visualizer</p>
      </div>
    </div>

    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="search-input" placeholder="Search tables or columns..." onkeyup="filterTables()">
    </div>

    <div class="controls">
      <button id="btn-mode-toggle" onclick="toggleCompactMode()">🗂️ Compact Mode</button>
      <button onclick="fitToScreen()">[ ] Fit to Screen</button>
      <button onclick="resetNodePositions()">⤢ Reset Layout</button>
      <button onclick="exportSVG()" class="btn-primary">⬇ SVG</button>
      <button onclick="exportPNG()">📷 PNG</button>
      <button onclick="exportJSON()">📋 JSON</button>
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

      <div class="sidebar-tabs">
        <button id="tab-models" class="tab-btn active" onclick="switchSidebarTab('models')">All Models (${tables.length})</button>
        <button id="tab-inspector" class="tab-btn" onclick="switchSidebarTab('inspector')">Inspector</button>
      </div>

      <!-- Models List Tab -->
      <div class="table-list" id="table-list">
        ${tables.map(t => `
          <div class="table-item" id="sidebar-item-${t}" data-table="${t}" onclick="selectModel('${t}', true)">
            <span class="table-item-name">${t}</span>
            <span class="table-item-count">${schemaMap[t].columns.length} cols • ${schemaMap[t].relations.length} rels</span>
          </div>
        `).join('')}
      </div>

      <!-- Inspector Tab -->
      <div id="inspector-view">
        <div class="inspector-header">
          <div class="inspector-title" id="insp-name">Select a Model</div>
          <div class="badge-pill" id="insp-type">TABLE</div>
        </div>

        <div>
          <div class="inspector-section-title">
            <span>🔗 Outgoing Relations (<span id="insp-out-count">0</span>)</span>
          </div>
          <div id="insp-outgoing-list"></div>
        </div>

        <div>
          <div class="inspector-section-title">
            <span>📥 Referenced By (Incoming: <span id="insp-in-count">0</span>)</span>
          </div>
          <div id="insp-incoming-list"></div>
        </div>

        <div>
          <div class="inspector-section-title">
            <span>📋 Column Definitions (<span id="insp-col-count">0</span>)</span>
          </div>
          <div class="cols-list" id="insp-cols-list"></div>
        </div>

        <button onclick="focusSelectedModel()" class="btn-primary" style="margin-top: 6px; justify-content: center;">🎯 Center on Canvas</button>
      </div>
    </aside>

    <main id="viewport">
      <div id="canvas-container">
        ${rawSvg}
      </div>

      <!-- Minimap Radar -->
      <div id="minimap" onclick="onMinimapClick(event)">
        <canvas id="minimap-canvas"></canvas>
        <div id="minimap-box"></div>
      </div>

      <!-- Zoom HUD -->
      <div class="zoom-hud">
        <button onclick="zoomBy(0.15)">＋</button>
        <button onclick="zoomBy(-0.15)">－</button>
        <button onclick="fitToScreen()">Fit</button>
        <button onclick="resetCanvas()">100%</button>
      </div>
    </main>
  </div>

  <div id="rel-tooltip"></div>
  <div id="toast" class="toast">Downloaded successfully!</div>

  <script>
    // Embedded Schema Graph Metadata
    const SCHEMA_DATA = ${JSON.stringify(schemaMetadata)};
    const INITIAL_POSITIONS = {};

    let scale = 1;
    let pointX = 0;
    let pointY = 0;
    let isCanvasPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    let draggingCard = null;
    let dragStartMouseX = 0;
    let dragStartMouseY = 0;
    let cardInitX = 0;
    let cardInitY = 0;

    let selectedModel = null;
    let isCompactMode = false;

    const viewport = document.getElementById('viewport');
    const container = document.getElementById('canvas-container');
    const tooltip = document.getElementById('rel-tooltip');

    const BOX_WIDTH = 280;
    const HEADER_HEIGHT = 46;
    const ROW_HEIGHT = 28;

    // 1. Initialize Graph & Event Listeners
    function initInteractiveGraph() {
      const cards = document.querySelectorAll('.table-card');
      cards.forEach(card => {
        const tableName = card.getAttribute('data-table');
        const x = parseFloat(card.getAttribute('data-x') || 0);
        const y = parseFloat(card.getAttribute('data-y') || 0);

        INITIAL_POSITIONS[tableName] = { x, y };

        // Card Drag Listener
        card.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          startCardDrag(e, card, tableName);
        });

        // Card Click Selection
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          selectModel(tableName, false);
        });

        // Hover Highlighting
        card.addEventListener('mouseenter', () => {
          if (!selectedModel) highlightConnections(tableName);
        });
        card.addEventListener('mouseleave', () => {
          if (!selectedModel) clearHighlights();
        });
      });

      // Relationship Hover Tooltips
      const edges = document.querySelectorAll('.rel-edge');
      edges.forEach(edge => {
        edge.addEventListener('mouseenter', (e) => {
          const from = edge.getAttribute('data-from');
          const to = edge.getAttribute('data-to');
          const fromField = edge.getAttribute('data-from-field');
          const toField = edge.getAttribute('data-to-field');
          const card = edge.getAttribute('data-cardinality');
          
          tooltip.innerHTML = \`<strong>\${from}.\${fromField}</strong> ➔ <strong>\${to}.\${toField}</strong> [\${card}]\`;
          tooltip.style.display = 'block';
          tooltip.style.left = (e.clientX + 14) + 'px';
          tooltip.style.top = (e.clientY + 14) + 'px';
          edge.classList.add('highlighted');
        });

        edge.addEventListener('mousemove', (e) => {
          tooltip.style.left = (e.clientX + 14) + 'px';
          tooltip.style.top = (e.clientY + 14) + 'px';
        });

        edge.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
          if (!selectedModel) edge.classList.remove('highlighted');
        });
      });

      // Clicking empty canvas clears selection
      viewport.addEventListener('click', () => {
        clearModelSelection();
      });

      // Fit to screen on startup
      setTimeout(fitToScreen, 80);
    }

    // 2. Drag & Drop Card with Dynamic Bezier Path Recalculation
    function startCardDrag(e, card, tableName) {
      // Bring dragged card to front of SVG
      const parent = card.parentNode;
      parent.appendChild(card);

      draggingCard = {
        name: tableName,
        el: card
      };
      dragStartMouseX = e.clientX;
      dragStartMouseY = e.clientY;
      cardInitX = parseFloat(card.getAttribute('data-x') || 0);
      cardInitY = parseFloat(card.getAttribute('data-y') || 0);
      card.classList.add('dragging');
    }

    window.addEventListener('mousemove', (e) => {
      if (draggingCard) {
        const dx = (e.clientX - dragStartMouseX) / scale;
        const dy = (e.clientY - dragStartMouseY) / scale;
        const newX = cardInitX + dx;
        const newY = cardInitY + dy;

        draggingCard.el.setAttribute('transform', \`translate(\${newX}, \${newY})\`);
        draggingCard.el.setAttribute('data-x', newX);
        draggingCard.el.setAttribute('data-y', newY);

        updateConnectedEdges(draggingCard.name);
        drawMinimap();
      } else if (isCanvasPanning) {
        pointX = e.clientX - panStartX;
        pointY = e.clientY - panStartY;
        updateTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (draggingCard) {
        draggingCard.el.classList.remove('dragging');
        draggingCard = null;
      }
      isCanvasPanning = false;
    });

    // 3. Dynamic Cubic Bezier Edge Re-routing
    function updateConnectedEdges(movedTable) {
      const edges = document.querySelectorAll('.rel-edge');

      edges.forEach(edge => {
        const from = edge.getAttribute('data-from');
        const to = edge.getAttribute('data-to');

        if (from === movedTable || to === movedTable) {
          const fromCard = document.getElementById('card-' + from);
          const toCard = document.getElementById('card-' + to);
          if (!fromCard || !toCard) return;

          const fX = parseFloat(fromCard.getAttribute('data-x'));
          const fY = parseFloat(fromCard.getAttribute('data-y'));
          const tX = parseFloat(toCard.getAttribute('data-x'));
          const tY = parseFloat(toCard.getAttribute('data-y'));

          const fromField = edge.getAttribute('data-from-field');
          const toField = edge.getAttribute('data-to-field');

          const fromModel = SCHEMA_DATA[from];
          const toModel = SCHEMA_DATA[to];

          const fromColIdx = fromModel ? fromModel.columns.findIndex(c => c.name === fromField) : 0;
          const toColIdx = toModel ? toModel.columns.findIndex(c => c.name === toField) : 0;

          const startY = fY + HEADER_HEIGHT + (fromColIdx >= 0 ? fromColIdx * ROW_HEIGHT + ROW_HEIGHT / 2 : 20);
          const endY = tY + HEADER_HEIGHT + (toColIdx >= 0 ? toColIdx * ROW_HEIGHT + ROW_HEIGHT / 2 : 20);

          let startX, endX;
          if (fX < tX) {
            startX = fX + BOX_WIDTH;
            endX = tX;
          } else if (fX > tX) {
            startX = fX;
            endX = tX + BOX_WIDTH;
          } else {
            startX = fX + BOX_WIDTH;
            endX = tX + BOX_WIDTH;
          }

          const dx = Math.max(40, Math.abs(endX - startX) * 0.5);
          const cp1x = startX < endX ? startX + dx : startX - dx;
          const cp1y = startY;
          const cp2x = startX < endX ? endX - dx : endX + dx;
          const cp2y = endY;

          const pathData = \`M \${startX} \${startY} C \${cp1x} \${cp1y}, \${cp2x} \${cp2y}, \${endX} \${endY}\`;
          edge.setAttribute('d', pathData);

          const anchor = document.getElementById('anchor-' + edge.id);
          if (anchor) {
            anchor.setAttribute('cx', startX);
            anchor.setAttribute('cy', startY);
          }
        }
      });
    }

    // 4. Model Selection & Left Sidebar Connection Inspector
    function selectModel(tableName, autoCenter = false) {
      selectedModel = tableName;

      document.querySelectorAll('.table-item').forEach(it => it.classList.remove('selected'));
      const activeItem = document.getElementById('sidebar-item-' + tableName);
      if (activeItem) activeItem.classList.add('selected');

      document.querySelectorAll('.table-card').forEach(c => c.classList.remove('selected'));
      const activeCard = document.getElementById('card-' + tableName);
      if (activeCard) activeCard.classList.add('selected');

      switchSidebarTab('inspector');
      renderInspector(tableName);
      highlightConnections(tableName);

      if (autoCenter && activeCard) {
        focusSelectedModel();
      }
    }

    function clearModelSelection() {
      selectedModel = null;
      document.querySelectorAll('.table-card').forEach(c => c.classList.remove('selected'));
      document.querySelectorAll('.table-item').forEach(it => it.classList.remove('selected'));
      clearHighlights();
    }

    function renderInspector(tableName) {
      const data = SCHEMA_DATA[tableName];
      if (!data) return;

      document.getElementById('insp-name').textContent = data.name;
      document.getElementById('insp-type').textContent = data.sourceType.toUpperCase();
      document.getElementById('insp-out-count').textContent = data.outgoing.length;
      document.getElementById('insp-in-count').textContent = data.incoming.length;
      document.getElementById('insp-col-count').textContent = data.columns.length;

      // Outgoing
      const outList = document.getElementById('insp-outgoing-list');
      if (data.outgoing.length === 0) {
        outList.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-bottom: 6px;">No outgoing foreign keys</div>';
      } else {
        outList.innerHTML = data.outgoing.map(o => \`
          <div class="rel-card">
            <div class="rel-card-header">
              <span style="font-size: 11px; color: var(--text);">➔ References:</span>
              <button class="rel-target-btn" onclick="selectModel('\${o.toTable}', true)">\${o.toTable}</button>
            </div>
            <div class="rel-card-detail">\${tableName}.\${o.fromField} ➔ \${o.toTable}.\${o.toField} [\${o.cardinality}]</div>
          </div>
        \`).join('');
      }

      // Incoming
      const inList = document.getElementById('insp-incoming-list');
      if (data.incoming.length === 0) {
        inList.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-bottom: 6px;">No other tables reference this model</div>';
      } else {
        inList.innerHTML = data.incoming.map(i => \`
          <div class="rel-card">
            <div class="rel-card-header">
              <span style="font-size: 11px; color: var(--text);">⬅ Referenced By:</span>
              <button class="rel-target-btn" onclick="selectModel('\${i.fromTable}', true)">\${i.fromTable}</button>
            </div>
            <div class="rel-card-detail">\${i.fromTable}.\${i.fromField} ➔ \${tableName}.\${i.toField} [\${i.cardinality}]</div>
          </div>
        \`).join('');
      }

      // Columns
      const colList = document.getElementById('insp-cols-list');
      colList.innerHTML = data.columns.map(c => \`
        <div class="col-row">
          <div class="col-row-name">
            \${c.isPrimary ? '<span class="pk-tag">PK</span>' : ''}
            \${c.isForeign ? '<span class="fk-tag">FK</span>' : ''}
            <span>\${c.name}</span>
          </div>
          <div class="col-row-type">\${c.type || 'any'}</div>
        </div>
      \`).join('');
    }

    function switchSidebarTab(tabName) {
      document.getElementById('tab-models').classList.toggle('active', tabName === 'models');
      document.getElementById('tab-inspector').classList.toggle('active', tabName === 'inspector');
      document.getElementById('table-list').style.display = tabName === 'models' ? 'flex' : 'none';
      document.getElementById('inspector-view').style.display = tabName === 'inspector' ? 'flex' : 'none';
    }

    // 5. Connection Highlighting & Sub-Graph Isolation
    function highlightConnections(tableName) {
      const connectedTables = new Set([tableName]);
      const activeEdges = new Set();

      const edges = document.querySelectorAll('.rel-edge');
      edges.forEach(edge => {
        const from = edge.getAttribute('data-from');
        const to = edge.getAttribute('data-to');

        if (from === tableName || to === tableName) {
          connectedTables.add(from);
          connectedTables.add(to);
          activeEdges.add(edge.id);
          edge.classList.add('highlighted');
        } else {
          edge.classList.remove('highlighted');
        }
      });

      document.querySelectorAll('.table-card').forEach(card => {
        const name = card.getAttribute('data-table');
        if (connectedTables.has(name)) {
          card.classList.remove('dimmed');
        } else {
          card.classList.add('dimmed');
        }
      });

      document.querySelectorAll('.rel-edge').forEach(edge => {
        if (activeEdges.has(edge.id)) {
          edge.classList.remove('dimmed');
        } else {
          edge.classList.add('dimmed');
        }
      });
    }

    function clearHighlights() {
      document.querySelectorAll('.table-card').forEach(c => c.classList.remove('dimmed'));
      document.querySelectorAll('.rel-edge').forEach(e => {
        e.classList.remove('dimmed');
        e.classList.remove('highlighted');
      });
    }

    // 6. Compact Mode for Large Databases (Shrinks cards to PK/FK only)
    function toggleCompactMode() {
      isCompactMode = !isCompactMode;
      const btn = document.getElementById('btn-mode-toggle');
      btn.textContent = isCompactMode ? '📋 Detailed Mode' : '🗂️ Compact Mode';
      btn.classList.toggle('btn-active', isCompactMode);

      const cards = document.querySelectorAll('.table-card');
      cards.forEach(card => {
        const tableName = card.getAttribute('data-table');
        const model = SCHEMA_DATA[tableName];
        if (!model) return;

        // Hide non-key rows in compact mode
        const rows = card.querySelectorAll('text[font-size="12"], text[font-size="10.5"], line, rect[width="22"]');
        // Simple display toggle
        const bgRect = card.querySelector('rect.card-bg');
        if (isCompactMode) {
          const keyColsCount = model.columns.filter(c => c.isPrimary || c.isForeign).length;
          const compactHeight = HEADER_HEIGHT + Math.max(1, keyColsCount) * ROW_HEIGHT + 14;
          bgRect.setAttribute('height', compactHeight);
          card.setAttribute('data-height', compactHeight);
        } else {
          const fullHeight = HEADER_HEIGHT + model.columns.length * ROW_HEIGHT + 14;
          bgRect.setAttribute('height', fullHeight);
          card.setAttribute('data-height', fullHeight);
        }
      });

      // Update edges and minimap
      Object.keys(SCHEMA_DATA).forEach(t => updateConnectedEdges(t));
      drawMinimap();
      showToast(isCompactMode ? '🗂️ Compact Mode Enabled (Keys only)' : '📋 Detailed Mode Enabled (All columns)');
    }

    // 7. Auto "Fit to Screen" Algorithm
    function fitToScreen() {
      const cards = document.querySelectorAll('.table-card');
      if (cards.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      cards.forEach(card => {
        const x = parseFloat(card.getAttribute('data-x'));
        const y = parseFloat(card.getAttribute('data-y'));
        const w = parseFloat(card.getAttribute('data-width') || BOX_WIDTH);
        const h = parseFloat(card.getAttribute('data-height') || 200);

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
      });

      const padding = 60;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      const graphW = maxX - minX;
      const graphH = maxY - minY;

      const vpRect = viewport.getBoundingClientRect();
      const scaleX = vpRect.width / graphW;
      const scaleY = vpRect.height / graphH;

      scale = Math.min(Math.max(0.2, Math.min(scaleX, scaleY) * 0.92), 2.0);

      pointX = (vpRect.width - graphW * scale) / 2 - (minX * scale);
      pointY = (vpRect.height - graphH * scale) / 2 - (minY * scale);

      updateTransform();
      drawMinimap();
    }

    // 8. Viewport Pan/Zoom & Focus Controls
    function updateTransform() {
      container.style.transform = \`translate(\${pointX}px, \${pointY}px) scale(\${scale})\`;
      updateMinimapBox();
    }

    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.zoom-hud') || e.target.closest('#minimap') || e.target.closest('.table-card')) return;
      isCanvasPanning = true;
      panStartX = e.clientX - pointX;
      panStartY = e.clientY - pointY;
    });

    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const xs = (e.clientX - pointX) / scale;
      const ys = (e.clientY - pointY) / scale;
      const delta = -e.deltaY;
      (delta > 0) ? (scale *= 1.1) : (scale /= 1.1);
      scale = Math.min(Math.max(0.15, scale), 4);
      pointX = e.clientX - xs * scale;
      pointY = e.clientY - ys * scale;
      updateTransform();
    });

    function zoomBy(delta) {
      scale = Math.min(Math.max(0.15, scale + delta), 4);
      updateTransform();
    }

    function resetCanvas() {
      scale = 1;
      pointX = 0;
      pointY = 0;
      updateTransform();
    }

    function focusSelectedModel() {
      if (!selectedModel) return;
      const card = document.getElementById('card-' + selectedModel);
      if (!card) return;

      const cardX = parseFloat(card.getAttribute('data-x'));
      const cardY = parseFloat(card.getAttribute('data-y'));
      const cardW = parseFloat(card.getAttribute('data-width') || BOX_WIDTH);
      const cardH = parseFloat(card.getAttribute('data-height') || 200);

      const vpRect = viewport.getBoundingClientRect();
      scale = 1;
      pointX = (vpRect.width / 2) - (cardX + cardW / 2);
      pointY = (vpRect.height / 2) - (cardY + cardH / 2);
      updateTransform();
    }

    function resetNodePositions() {
      Object.keys(INITIAL_POSITIONS).forEach(tableName => {
        const card = document.getElementById('card-' + tableName);
        if (!card) return;
        const init = INITIAL_POSITIONS[tableName];
        card.setAttribute('transform', \`translate(\${init.x}, \${init.y})\`);
        card.setAttribute('data-x', init.x);
        card.setAttribute('data-y', init.y);
        updateConnectedEdges(tableName);
      });
      fitToScreen();
      showToast('⤢ Layout restored to initial positions!');
    }

    function filterTables() {
      const q = document.getElementById('search-input').value.toLowerCase();
      const items = document.querySelectorAll('.table-item');
      items.forEach(item => {
        const name = item.getAttribute('data-table').toLowerCase();
        item.style.display = name.includes(q) ? 'flex' : 'none';
      });

      const cards = document.querySelectorAll('.table-card');
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.opacity = !q || text.includes(q) ? '1' : '0.12';
      });
    }

    // 9. Interactive Minimap Radar
    function drawMinimap() {
      const canvas = document.getElementById('minimap-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width = 180;
      const h = canvas.height = 120;

      ctx.clearRect(0, 0, w, h);

      const cards = document.querySelectorAll('.table-card');
      if (cards.length === 0) return;

      let minX = 0, minY = 0, maxX = 1600, maxY = 1200;
      cards.forEach(card => {
        const x = parseFloat(card.getAttribute('data-x'));
        const y = parseFloat(card.getAttribute('data-y'));
        if (x + 300 > maxX) maxX = x + 300;
        if (y + 300 > maxY) maxY = y + 300;
      });

      const mScaleX = w / maxX;
      const mScaleY = h / maxY;

      ctx.fillStyle = '#89b4fa';
      cards.forEach(card => {
        const x = parseFloat(card.getAttribute('data-x')) * mScaleX;
        const y = parseFloat(card.getAttribute('data-y')) * mScaleY;
        const cardW = (parseFloat(card.getAttribute('data-width')) || BOX_WIDTH) * mScaleX;
        const cardH = (parseFloat(card.getAttribute('data-height')) || 120) * mScaleY;

        ctx.fillRect(x, y, Math.max(3, cardW), Math.max(2, cardH));
      });

      updateMinimapBox();
    }

    function updateMinimapBox() {
      const box = document.getElementById('minimap-box');
      const vpRect = viewport.getBoundingClientRect();
      const canvas = document.getElementById('minimap-canvas');
      if (!canvas || !box) return;

      const maxX = 1600, maxY = 1200;
      const mScaleX = canvas.width / maxX;
      const mScaleY = canvas.height / maxY;

      const boxX = (-pointX / scale) * mScaleX;
      const boxY = (-pointY / scale) * mScaleY;
      const boxW = (vpRect.width / scale) * mScaleX;
      const boxH = (vpRect.height / scale) * mScaleY;

      box.style.left = Math.max(0, boxX) + 'px';
      box.style.top = Math.max(0, boxY) + 'px';
      box.style.width = Math.min(canvas.width, boxW) + 'px';
      box.style.height = Math.min(canvas.height, boxH) + 'px';
    }

    function onMinimapClick(e) {
      const rect = document.getElementById('minimap').getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const maxX = 1600, maxY = 1200;
      const targetWorldX = (clickX / rect.width) * maxX;
      const targetWorldY = (clickY / rect.height) * maxY;

      const vpRect = viewport.getBoundingClientRect();
      pointX = (vpRect.width / 2) - targetWorldX * scale;
      pointY = (vpRect.height / 2) - targetWorldY * scale;
      updateTransform();
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    }

    // 10. Exports
    function exportSVG() {
      const svg = document.getElementById('schemagraph-svg').outerHTML;
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database-schema.svg';
      a.click();
      showToast('✅ SVG Diagram downloaded!');
    }

    function exportPNG() {
      const svgElement = document.getElementById('schemagraph-svg');
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgElement.viewBox.baseVal.width || 1400;
        canvas.height = svgElement.viewBox.baseVal.height || 1000;
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

    function exportJSON() {
      const jsonStr = JSON.stringify(SCHEMA_DATA, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database-schema.json';
      a.click();
      showToast('✅ JSON AST downloaded!');
    }

    // Boot
    initInteractiveGraph();
  </script>
</body>
</html>`;
    }
}

module.exports = HTMLRenderer;
