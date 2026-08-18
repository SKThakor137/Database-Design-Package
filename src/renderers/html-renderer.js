/**
 * Interactive Single-Page HTML Viewer
 * Fully interactive visual ERD explorer with:
 * - Ultra-Crisp Pure Vector Rendering (Zero blur at any zoom level from 2% to 1000%)
 * - Table Active State & Sub-graph Highlighting (vivid sharp active cards, edge illumination, column-level hover)
 * - Collapsible Left Drawer (Sidebar) with toggle button, keyboard shortcut ([), and floating restore tab
 * - Rich Relationship UI/UX (bidirectional port anchors, FK target badges, rich Inspector cards with cardinality pills and focus actions)
 * - Max Canvas Zoom (0.02x to 10.0x / 1000%), mouse-centered zoom, Zoom HUD presets, Fit to Screen, Fullscreen mode
 * - Draggable table cards with real-time cubic Bézier connector re-routing
 * - Interactive Minimap radar navigator with drag-to-pan
 * Pure Node.js - Zero dependencies.
 */

const SVGRenderer = require('./svg-renderer');
const LayoutEngine = require('../layout/layout-engine');

class HTMLRenderer {
    static generateHTML(schemaMap, options = {}) {
        const title = options.title || 'Database Schema Explorer';
        const rawSvg = SVGRenderer.generateSVG(schemaMap, { ...options, theme: 'catppuccin', interactive: true });
        const tables = Object.keys(schemaMap);
        const totalCols = tables.reduce((acc, t) => acc + schemaMap[t].columns.length, 0);
        const totalRels = tables.reduce((acc, t) => acc + schemaMap[t].relations.length, 0);

        // Precompute relations map for each table for instant client-side lookup
        const schemaMetadata = {};
        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            const outgoing = [];
            const incoming = [];

            table.relations.forEach((r, rIdx) => {
                const color = SVGRenderer.getEdgeColor(tableName, r.from, r.toTable, r.toField);
                outgoing.push({
                    fromField: r.from,
                    toTable: r.toTable,
                    toField: r.toField,
                    cardinality: r.cardinality || 'N:1',
                    color
                });
            });

            tables.forEach(otherName => {
                if (otherName === tableName) return;
                const otherTable = schemaMap[otherName];
                otherTable.relations.forEach(r => {
                    if (r.toTable === tableName) {
                        const color = SVGRenderer.getEdgeColor(otherName, r.from, tableName, r.toField);
                        incoming.push({
                            fromTable: otherName,
                            fromField: r.from,
                            toField: r.toField,
                            cardinality: r.cardinality || 'N:1',
                            color
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
      --primary-glow: rgba(137, 180, 250, 0.4);
      --accent: #f38ba8;
      --success: #a6e3a1;
      --purple: #cba6f7;
      --yellow: #f9e2af;
      --cyan: #89dceb;
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
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Top Header */
    header {
      height: 56px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 20;
      gap: 12px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .drawer-toggle-btn {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .drawer-toggle-btn:hover {
      background: var(--border-bright);
      border-color: var(--primary);
      color: #fff;
    }

    .logo-badge {
      background: linear-gradient(135deg, #89b4fa, #cba6f7);
      color: #11111b;
      font-weight: 900;
      font-size: 13px;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: -0.5px;
    }

    .title-group h1 {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.3px;
      white-space: nowrap;
    }

    .title-group p {
      font-size: 10.5px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    /* Search Box */
    .search-box {
      position: relative;
      width: 260px;
      flex-shrink: 1;
    }

    .search-box input {
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 7px 12px 7px 32px;
      color: var(--text);
      font-size: 12.5px;
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
      font-size: 13px;
      pointer-events: none;
    }

    /* Action Controls */
    .controls {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
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

    .shortcut-badge {
      font-size: 9px;
      background: rgba(255,255,255,0.1);
      padding: 1px 4px;
      border-radius: 3px;
      color: var(--text-muted);
    }

    /* Main Workspace Layout */
    .workspace {
      display: flex;
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    /* Collapsible Left Sidebar */
    aside {
      width: 330px;
      min-width: 330px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      z-index: 10;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    aside.collapsed {
      width: 0 !important;
      min-width: 0 !important;
      padding: 0 !important;
      border-right: none !important;
      opacity: 0;
      pointer-events: none;
    }

    .drawer-header {
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      background: rgba(0,0,0,0.15);
    }

    .drawer-header-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }

    .stats-card {
      padding: 10px 14px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      border-bottom: 1px solid var(--border);
      background: rgba(0,0,0,0.1);
    }

    .stat-item {
      background: var(--card);
      padding: 6px 4px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid var(--border);
    }

    .stat-val {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-lbl {
      font-size: 9px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 1px;
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
      padding: 9px 10px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted);
      justify-content: center;
    }

    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      background: rgba(137, 180, 250, 0.06);
    }

    /* Table List View */
    .table-list {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-y: auto;
    }

    .table-item {
      padding: 8px 11px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 7px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.15s;
    }

    .table-item:hover {
      border-color: var(--primary);
      background: var(--card-hover);
      transform: translateX(2px);
    }

    .table-item.selected {
      border-color: var(--primary);
      background: rgba(137, 180, 250, 0.15);
      box-shadow: 0 0 0 1px var(--primary);
      transform: translateX(3px);
    }

    .table-item-name {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text);
    }

    .table-item-count {
      font-size: 10px;
      color: var(--text-muted);
      background: var(--surface);
      padding: 2px 6px;
      border-radius: 10px;
    }

    /* Inspector View */
    #inspector-view {
      padding: 12px;
      display: none;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
    }

    .inspector-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
      gap: 8px;
    }

    .inspector-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
      word-break: break-all;
    }

    .badge-pill {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(137, 180, 250, 0.2);
      color: var(--primary);
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .inspector-section-title {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Rich Relationship Cards */
    .rel-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 8px 10px;
      margin-bottom: 6px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      transition: all 0.15s;
    }

    .rel-card:hover {
      border-color: var(--primary);
      background: var(--card-hover);
    }

    .rel-card-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .rel-target-btn {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent);
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
    }

    .rel-target-btn:hover {
      color: #fff;
    }

    .rel-card-path {
      display: flex;
      align-items: center;
      gap: 5px;
      font-family: var(--mono);
      font-size: 10.5px;
      color: var(--text);
      background: rgba(0,0,0,0.25);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.05);
      overflow-x: auto;
    }

    .rel-cardinality-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(203, 166, 247, 0.2);
      color: var(--purple);
      font-family: var(--mono);
      flex-shrink: 0;
    }

    .rel-actions {
      display: flex;
      gap: 4px;
      margin-top: 2px;
    }

    .rel-act-btn {
      flex: 1;
      padding: 3px 6px;
      font-size: 10px;
      justify-content: center;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .rel-act-btn:hover {
      background: var(--border-bright);
      border-color: var(--primary);
    }

    /* Column Definitions in Inspector */
    .cols-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-height: 260px;
      overflow-y: auto;
    }

    .col-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 8px;
      background: var(--card);
      border-radius: 5px;
      font-size: 11px;
      border: 1px solid transparent;
      transition: all 0.1s;
    }

    .col-row:hover {
      border-color: var(--border-bright);
      background: var(--card-hover);
    }

    .col-row-name {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: 500;
    }

    .pk-tag {
      font-size: 8px;
      font-weight: bold;
      background: var(--yellow);
      color: #11111b;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .fk-tag {
      font-size: 8px;
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

    /* Canvas Viewport */
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
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    #schemagraph-svg {
      width: 100%;
      height: 100%;
      display: block;
      shape-rendering: geometricPrecision;
      text-rendering: geometricPrecision;
    }

    /* SVG Table Cards & Active Styling */
    .table-card {
      transition: opacity 0.2s;
    }

    .table-card:hover rect.card-bg {
      stroke: var(--primary) !important;
      stroke-width: 2.2px !important;
    }

    /* Prominent Razor-Sharp Active Selected Card */
    .table-card.selected rect.card-bg {
      stroke: #89b4fa !important;
      stroke-width: 3.5px !important;
    }

    .table-card.selected .card-header {
      filter: brightness(1.2);
    }

    .table-card.dragging {
      cursor: grabbing !important;
    }

    .card-col-row:hover .col-row-bg {
      fill: rgba(137, 180, 250, 0.15) !important;
    }

    .dimmed {
      opacity: 0.18 !important;
      transition: opacity 0.2s;
    }

    /* Relationship Connector Edges (Multi-Color Vector Wires) */
    .rel-edge {
      transition: stroke-width 0.15s, opacity 0.15s;
    }

    .rel-edge:hover, .rel-edge.highlighted {
      stroke-width: 4px !important;
      stroke-dasharray: none !important;
      opacity: 1 !important;
    }

    .rel-edge.spotlight {
      stroke-width: 5.5px !important;
      stroke-dasharray: none !important;
      opacity: 1 !important;
    }

    .rel-anchor.highlighted {
      r: 6 !important;
    }

    .rel-anchor.spotlight {
      r: 7.5 !important;
    }

    /* Floating Zoom HUD Controls */
    .zoom-hud {
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: var(--surface);
      border: 1px solid var(--border-bright);
      border-radius: 10px;
      display: flex;
      align-items: center;
      padding: 5px;
      gap: 5px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
      z-index: 15;
    }

    .zoom-hud button {
      padding: 6px 10px;
      font-size: 12px;
    }

    .zoom-val-btn {
      font-family: var(--mono);
      font-size: 11.5px;
      min-width: 58px;
      justify-content: center;
      color: var(--primary);
    }

    /* Zoom presets dropdown menu */
    #zoom-presets-menu {
      position: absolute;
      bottom: 48px;
      right: 70px;
      background: var(--card);
      border: 1px solid var(--border-bright);
      border-radius: 8px;
      display: none;
      flex-direction: column;
      gap: 2px;
      padding: 6px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      z-index: 25;
      min-width: 110px;
    }

    .zoom-preset-item {
      padding: 6px 10px;
      font-size: 11.5px;
      color: var(--text);
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-align: left;
      width: 100%;
      justify-content: space-between;
    }

    .zoom-preset-item:hover {
      background: var(--border-bright);
      color: var(--primary);
    }

    /* Interactive Minimap Radar */
    #minimap {
      position: absolute;
      bottom: 24px;
      left: 24px;
      width: 190px;
      height: 130px;
      background: rgba(24, 24, 37, 0.92);
      border: 1px solid var(--border-bright);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 15;
      overflow: hidden;
      cursor: pointer;
      backdrop-filter: blur(4px);
    }

    #minimap-canvas {
      width: 100%;
      height: 100%;
    }

    #minimap-box {
      position: absolute;
      border: 1.5px solid var(--primary);
      background: rgba(137, 180, 250, 0.18);
      pointer-events: none;
    }

    /* Rich Floating Tooltip */
    #rel-tooltip {
      position: fixed;
      display: none;
      background: #1e1e2e;
      border: 1px solid var(--primary);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11.5px;
      pointer-events: none;
      z-index: 99;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      line-height: 1.4;
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
      <button class="drawer-toggle-btn btn-active" id="btn-toggle-drawer" onclick="toggleSidebarDrawer()" title="Toggle Sidebar (Shortcut: [ )">
        <span id="drawer-toggle-icon">☰</span>
        <span>Sidebar</span>
        <span class="shortcut-badge">[</span>
      </button>
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
      <button onclick="fitToScreen()" title="Fit entire schema into viewport">[ ] Fit to Screen</button>
      <button onclick="resetNodePositions()" title="Restore original auto-layout">⤢ Reset Layout</button>
      <button onclick="toggleFullscreen()" title="Toggle Fullscreen Canvas">⛶ Fullscreen</button>
      <button onclick="exportSVG()" class="btn-primary">⬇ SVG</button>
      <button onclick="exportPNG()">📷 PNG</button>
      <button onclick="exportJSON()">📋 JSON</button>
    </div>
  </header>

  <div class="workspace">
    <!-- Left Sidebar -->
    <aside id="sidebar-drawer">
      <div class="drawer-header">
        <span class="drawer-header-title">Database Overview</span>
      </div>

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
          <div>
            <div class="inspector-title" id="insp-name">Select a Model</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Active Model Details</div>
          </div>
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

        <div style="display: flex; gap: 6px; margin-top: 4px;">
          <button onclick="focusSelectedModel()" class="btn-primary" style="flex: 1; justify-content: center;">🎯 Center Table</button>
          <button onclick="clearModelSelection()" style="padding: 6px 10px;" title="Clear Active Selection">✕ Clear</button>
        </div>
      </div>
    </aside>

    <!-- Main Viewport Canvas -->
    <main id="viewport">
      <div id="canvas-container">
        ${rawSvg}
      </div>

      <!-- Minimap Radar -->
      <div id="minimap" onclick="onMinimapClick(event)">
        <canvas id="minimap-canvas"></canvas>
        <div id="minimap-box"></div>
      </div>

      <!-- Zoom Presets Dropdown Menu -->
      <div id="zoom-presets-menu">
        <button class="zoom-preset-item" onclick="setZoomScale(0.25)">25%</button>
        <button class="zoom-preset-item" onclick="setZoomScale(0.5)">50%</button>
        <button class="zoom-preset-item" onclick="setZoomScale(0.75)">75%</button>
        <button class="zoom-preset-item" onclick="setZoomScale(1.0)">100% (Default)</button>
        <button class="zoom-preset-item" onclick="setZoomScale(1.5)">150%</button>
        <button class="zoom-preset-item" onclick="setZoomScale(2.0)">200%</button>
        <button class="zoom-preset-item" onclick="setZoomScale(4.0)">400%</button>
        <button class="zoom-preset-item" onclick="setZoomScale(8.0)">800%</button>
        <button class="zoom-preset-item" onclick="setZoomScale(10.0)">1000% (Max)</button>
        <div style="height: 1px; background: var(--border); margin: 3px 0;"></div>
        <button class="zoom-preset-item" onclick="fitToScreen()">[ ] Fit to Screen</button>
      </div>

      <!-- Floating Zoom HUD -->
      <div class="zoom-hud">
        <button onclick="zoomBy(0.2)" title="Zoom In (Key: +)">＋</button>
        <button onclick="zoomBy(-0.2)" title="Zoom Out (Key: -)">－</button>
        <button class="zoom-val-btn" id="zoom-val-display" onclick="toggleZoomPresetsMenu()" title="Click to choose zoom preset">100%</button>
        <button onclick="fitToScreen()" title="Auto-scale & Center all models">Fit</button>
        <button onclick="resetCanvas()" title="Reset to 100% Zoom">100%</button>
        <button onclick="toggleFullscreen()" title="Toggle Fullscreen">⛶</button>
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
    let didCardMove = false;

    let selectedModel = null;
    let isCompactMode = false;
    let isDrawerCollapsed = false;

    const viewport = document.getElementById('viewport');
    const container = document.getElementById('canvas-container');
    const stage = document.getElementById('canvas-stage');
    const tooltip = document.getElementById('rel-tooltip');
    const sidebarDrawer = document.getElementById('sidebar-drawer');
    const drawerToggleIcon = document.getElementById('drawer-toggle-icon');
    const zoomValDisplay = document.getElementById('zoom-val-display');
    const zoomPresetsMenu = document.getElementById('zoom-presets-menu');

    const BOX_WIDTH = 280;
    const HEADER_HEIGHT = 46;
    const ROW_HEIGHT = 28;

    // Minimum and Maximum Zoom Constraints (Deep Eagle-Eye to 1000% Ultra-Crisp Zoom)
    const MIN_ZOOM = 0.02;
    const MAX_ZOOM = 10.0;

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

        // Hover Highlighting
        card.addEventListener('mouseenter', () => {
          if (!selectedModel) highlightConnections(tableName);
        });
        card.addEventListener('mouseleave', () => {
          if (!selectedModel) clearHighlights();
        });

        // Column row level hover
        const colRows = card.querySelectorAll('.card-col-row');
        colRows.forEach(row => {
          const colName = row.getAttribute('data-col');
          row.addEventListener('mouseenter', (e) => {
            e.stopPropagation();
            highlightColumnRelation(tableName, colName);
          });
          row.addEventListener('mouseleave', () => {
            if (selectedModel) {
              highlightConnections(selectedModel);
            } else {
              clearHighlights();
            }
          });
        });
      });

      // Relationship Hover Tooltips & Click
      const edges = document.querySelectorAll('.rel-edge');
      edges.forEach(edge => {
        edge.addEventListener('mouseenter', (e) => {
          const from = edge.getAttribute('data-from');
          const to = edge.getAttribute('data-to');
          const fromField = edge.getAttribute('data-from-field');
          const toField = edge.getAttribute('data-to-field');
          const card = edge.getAttribute('data-cardinality') || 'N:1';
          const color = edge.getAttribute('data-color') || '#89b4fa';
          
          tooltip.innerHTML = \`
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: \${color}; flex-shrink: 0;"></span>
              <strong style="color: \${color}; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px;">Foreign Key Connection</strong>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #fff;">
              <span>\${from}.\${fromField}</span>
              <span style="color: \${color}; margin: 0 4px;">➔</span>
              <span>\${to}.\${toField}</span>
            </div>
            <div style="font-size: 10px; color: #a6adc8; margin-top: 3px;">Cardinality: <span style="color: \${color}; font-weight: bold;">[\${card}]</span> (Click to inspect model)</div>
          \`;
          tooltip.style.borderLeft = \`4px solid \${color}\`;
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

        edge.addEventListener('click', (e) => {
          e.stopPropagation();
          const from = edge.getAttribute('data-from');
          selectModel(from, true);
        });
      });

      // Clicking empty canvas clears selection
      viewport.addEventListener('click', (e) => {
        if (!e.target.closest('.zoom-hud') && !e.target.closest('#minimap') && !e.target.closest('#zoom-presets-menu')) {
          clearModelSelection();
          if (zoomPresetsMenu) zoomPresetsMenu.style.display = 'none';
        }
      });

      // Fit to screen on startup
      setTimeout(fitToScreen, 100);
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
      didCardMove = false;
      card.classList.add('dragging');
    }

    window.addEventListener('mousemove', (e) => {
      if (draggingCard) {
        const dx = (e.clientX - dragStartMouseX) / scale;
        const dy = (e.clientY - dragStartMouseY) / scale;

        if (Math.hypot(e.clientX - dragStartMouseX, e.clientY - dragStartMouseY) > 5) {
          didCardMove = true;
        }

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

    window.addEventListener('mouseup', (e) => {
      if (draggingCard) {
        const tableName = draggingCard.name;
        draggingCard.el.classList.remove('dragging');
        draggingCard = null;

        // If mouse didn't move significantly, treat as a direct table click selection!
        if (!didCardMove) {
          selectModel(tableName, false);
        }
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
          if (fX + BOX_WIDTH < tX) {
            startX = fX + BOX_WIDTH;
            endX = tX;
          } else if (fX > tX + BOX_WIDTH) {
            startX = fX;
            endX = tX + BOX_WIDTH;
          } else if (fX <= tX) {
            startX = fX + BOX_WIDTH;
            endX = tX + BOX_WIDTH;
          } else {
            startX = fX;
            endX = tX;
          }

          const dx = Math.max(50, Math.abs(endX - startX) * 0.5);
          const cp1x = startX < endX ? startX + dx : startX - dx;
          const cp1y = startY;
          const cp2x = startX < endX ? endX - dx : endX + dx;
          const cp2y = endY;

          const pathData = \`M \${startX} \${startY} C \${cp1x} \${cp1y}, \${cp2x} \${cp2y}, \${endX} \${endY}\`;
          edge.setAttribute('d', pathData);

          const startAnchor = document.getElementById('anchor-start-' + edge.id);
          if (startAnchor) {
            startAnchor.setAttribute('cx', startX);
            startAnchor.setAttribute('cy', startY);
          }

          const endAnchor = document.getElementById('anchor-end-' + edge.id);
          if (endAnchor) {
            endAnchor.setAttribute('cx', endX);
            endAnchor.setAttribute('cy', endY);
          }
        }
      });
    }

    // 4. Model Selection & Left Sidebar Connection Inspector
    function selectModel(tableName, autoCenter = false) {
      selectedModel = tableName;

      // Update sidebar model items
      document.querySelectorAll('.table-item').forEach(it => it.classList.remove('selected'));
      const activeItem = document.getElementById('sidebar-item-' + tableName);
      if (activeItem) {
        activeItem.classList.add('selected');
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }

      // Update SVG table cards active states
      document.querySelectorAll('.table-card').forEach(c => c.classList.remove('selected'));
      const activeCard = document.getElementById('card-' + tableName);
      if (activeCard) {
        activeCard.classList.add('selected');
        // Bring to front
        activeCard.parentNode.appendChild(activeCard);
      }

      // Update sidebar inspector content
      renderInspector(tableName);
      switchSidebarTab('inspector');
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

      // Outgoing Foreign Keys
      const outList = document.getElementById('insp-outgoing-list');
      if (data.outgoing.length === 0) {
        outList.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic; padding: 4px 0;">No outgoing foreign keys</div>';
      } else {
        outList.innerHTML = data.outgoing.map(o => \`
          <div class="rel-card" style="border-left: 3.5px solid \${o.color}; cursor: pointer;" onmouseenter="spotlightEdge('\${tableName}', '\${o.fromField}', '\${o.toTable}', '\${o.toField}')" onmouseleave="unspotlightEdges()">
            <div class="rel-card-row">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: \${o.color}; flex-shrink: 0;"></span>
                <span style="font-size: 11px; color: var(--text-muted);">➔ Foreign Key Target:</span>
              </div>
              <button class="rel-target-btn" style="color: \${o.color}; font-weight: 700;" onclick="selectModel('\${o.toTable}', true)">\${o.toTable}</button>
            </div>
            <div class="rel-card-path">
              <span style="color: \${o.color}; font-weight: bold;">[FK]</span>
              <span>\${tableName}.\${o.fromField}</span>
              <span style="color: \${o.color}; margin: 0 2px;">➔</span>
              <span>\${o.toTable}.\${o.toField}</span>
              <span class="rel-cardinality-badge" style="color: \${o.color}; background: rgba(255,255,255,0.08);">\${o.cardinality}</span>
            </div>
            <div class="rel-actions">
              <button class="rel-act-btn" onclick="focusRelationshipEdge('\${tableName}', '\${o.fromField}', '\${o.toTable}', '\${o.toField}')">🎯 Focus Link</button>
              <button class="rel-act-btn" onclick="selectModel('\${o.toTable}', true)">➔ Open \${o.toTable}</button>
            </div>
          </div>
        \`).join('');
      }

      // Incoming References
      const inList = document.getElementById('insp-incoming-list');
      if (data.incoming.length === 0) {
        inList.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic; padding: 4px 0;">No other tables reference this model</div>';
      } else {
        inList.innerHTML = data.incoming.map(i => \`
          <div class="rel-card" style="border-left: 3.5px solid \${i.color}; cursor: pointer;" onmouseenter="spotlightEdge('\${i.fromTable}', '\${i.fromField}', '\${tableName}', '\${i.toField}')" onmouseleave="unspotlightEdges()">
            <div class="rel-card-row">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: \${i.color}; flex-shrink: 0;"></span>
                <span style="font-size: 11px; color: var(--text-muted);">⬅ Referenced By:</span>
              </div>
              <button class="rel-target-btn" style="color: \${i.color}; font-weight: 700;" onclick="selectModel('\${i.fromTable}', true)">\${i.fromTable}</button>
            </div>
            <div class="rel-card-path">
              <span style="color: \${i.color}; font-weight: bold;">[REF]</span>
              <span>\${i.fromTable}.\${i.fromField}</span>
              <span style="color: \${i.color}; margin: 0 2px;">➔</span>
              <span>\${tableName}.\${i.toField}</span>
              <span class="rel-cardinality-badge" style="color: \${i.color}; background: rgba(255,255,255,0.08);">\${i.cardinality}</span>
            </div>
            <div class="rel-actions">
              <button class="rel-act-btn" onclick="focusRelationshipEdge('\${i.fromTable}', '\${i.fromField}', '\${tableName}', '\${i.toField}')">🎯 Focus Link</button>
              <button class="rel-act-btn" onclick="selectModel('\${i.fromTable}', true)">➔ Open \${i.fromTable}</button>
            </div>
          </div>
        \`).join('');
      }

      // Columns Definitions
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

    // 5. Collapsible Sidebar Toggle (Single Header Button / Shortcut [)
    function toggleSidebarDrawer() {
      isDrawerCollapsed = !isDrawerCollapsed;
      sidebarDrawer.classList.toggle('collapsed', isDrawerCollapsed);
      const btnToggle = document.getElementById('btn-toggle-drawer');
      if (btnToggle) {
        btnToggle.classList.toggle('btn-active', !isDrawerCollapsed);
      }

      // Update minimap and viewport transform
      setTimeout(() => {
        drawMinimap();
      }, 260);
    }

    // 6. Connection Highlighting & Sub-Graph Isolation
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
          edge.classList.remove('dimmed');
        } else {
          edge.classList.remove('highlighted');
          edge.classList.remove('spotlight');
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

      document.querySelectorAll('.rel-anchor').forEach(anchor => {
        const edgeId = anchor.getAttribute('data-edge');
        if (activeEdges.has(edgeId)) {
          anchor.classList.add('highlighted');
          anchor.classList.remove('dimmed');
        } else {
          anchor.classList.remove('highlighted');
          anchor.classList.remove('spotlight');
          anchor.classList.add('dimmed');
        }
      });
    }

    function highlightColumnRelation(tableName, colName) {
      const edges = document.querySelectorAll('.rel-edge');
      let foundEdge = false;

      edges.forEach(edge => {
        const from = edge.getAttribute('data-from');
        const to = edge.getAttribute('data-to');
        const fromField = edge.getAttribute('data-from-field');
        const toField = edge.getAttribute('data-to-field');

        if ((from === tableName && fromField === colName) || (to === tableName && toField === colName)) {
          edge.classList.add('spotlight');
          edge.classList.remove('dimmed');
          foundEdge = true;
        } else {
          edge.classList.remove('spotlight');
          edge.classList.add('dimmed');
        }
      });

      if (foundEdge) {
        document.querySelectorAll('.table-card').forEach(card => {
          const name = card.getAttribute('data-table');
          const isRelated = Array.from(edges).some(e => 
            e.classList.contains('spotlight') && 
            (e.getAttribute('data-from') === name || e.getAttribute('data-to') === name)
          );
          card.classList.toggle('dimmed', !isRelated);
        });
      }
    }

    let activeFocusedEdge = null;

    function spotlightEdge(fromTable, fromField, toTable, toField) {
      const edgeId = \`edge-\${fromTable}-\${fromField}-\${toTable}-\${toField}\`;
      const targetEdge = document.getElementById(edgeId);
      if (!targetEdge) return;

      document.querySelectorAll('.rel-edge').forEach(e => {
        if (e.id === edgeId) {
          e.classList.add('spotlight');
          e.classList.remove('dimmed');
        } else {
          e.classList.remove('spotlight');
          e.classList.add('dimmed');
        }
      });

      document.querySelectorAll('.rel-anchor').forEach(a => {
        if (a.getAttribute('data-edge') === edgeId) {
          a.classList.add('spotlight');
          a.classList.remove('dimmed');
        } else {
          a.classList.remove('spotlight');
          a.classList.add('dimmed');
        }
      });

      document.querySelectorAll('.table-card').forEach(card => {
        const name = card.getAttribute('data-table');
        card.classList.toggle('dimmed', name !== fromTable && name !== toTable);
      });
    }

    function unspotlightEdges() {
      if (activeFocusedEdge) return;
      document.querySelectorAll('.rel-edge').forEach(e => e.classList.remove('spotlight'));
      document.querySelectorAll('.rel-anchor').forEach(a => a.classList.remove('spotlight'));
      if (selectedModel) {
        highlightConnections(selectedModel);
      } else {
        clearHighlights();
      }
    }

    function clearHighlights() {
      activeFocusedEdge = null;
      document.querySelectorAll('.table-card').forEach(c => c.classList.remove('dimmed'));
      document.querySelectorAll('.rel-edge').forEach(e => {
        e.classList.remove('dimmed');
        e.classList.remove('highlighted');
        e.classList.remove('spotlight');
      });
      document.querySelectorAll('.rel-anchor').forEach(a => {
        a.classList.remove('dimmed');
        a.classList.remove('highlighted');
        a.classList.remove('spotlight');
      });
    }

    let currentAnimFrame = null;
    function animateViewportTo(targetX, targetY, targetScale, duration = 420, onComplete = null) {
      if (currentAnimFrame) {
        cancelAnimationFrame(currentAnimFrame);
        currentAnimFrame = null;
      }

      const startX = pointX;
      const startY = pointY;
      const startScale = scale;
      const startTime = performance.now();

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = easeOutCubic(progress);

        pointX = startX + (targetX - startX) * ease;
        pointY = startY + (targetY - startY) * ease;
        scale = startScale + (targetScale - startScale) * ease;

        updateTransform();

        if (progress < 1) {
          currentAnimFrame = requestAnimationFrame(step);
        } else {
          currentAnimFrame = null;
          drawMinimap();
          if (onComplete) onComplete();
        }
      }

      currentAnimFrame = requestAnimationFrame(step);
    }

    function focusSelectedModel() {
      if (!selectedModel) return;
      const card = document.getElementById('card-' + selectedModel);
      if (!card) return;

      const x = parseFloat(card.getAttribute('data-x'));
      const y = parseFloat(card.getAttribute('data-y'));
      const w = parseFloat(card.getAttribute('data-width') || BOX_WIDTH);
      const h = parseFloat(card.getAttribute('data-height') || 200);

      const midX = x + w / 2;
      const midY = y + h / 2;

      const vpRect = viewport.getBoundingClientRect();
      const targetScale = 1.3;

      const targetPointX = (vpRect.width / 2) - (midX * targetScale);
      const targetPointY = (vpRect.height / 2) - (midY * targetScale);

      animateViewportTo(targetPointX, targetPointY, targetScale, 420);
      showToast(\`🎯 Centered \${selectedModel}\`);
    }

    function focusRelationshipEdge(fromTable, fromField, toTable, toField) {
      const edgeId = \`edge-\${fromTable}-\${fromField}-\${toTable}-\${toField}\`;
      const edge = document.getElementById(edgeId);
      if (!edge) return;

      const fromCard = document.getElementById('card-' + fromTable);
      const toCard = document.getElementById('card-' + toTable);
      if (!fromCard || !toCard) return;

      // Bring both cards to front
      fromCard.parentNode.appendChild(fromCard);
      toCard.parentNode.appendChild(toCard);

      const fX = parseFloat(fromCard.getAttribute('data-x') || 0);
      const fY = parseFloat(fromCard.getAttribute('data-y') || 0);
      const fW = parseFloat(fromCard.getAttribute('data-width') || BOX_WIDTH);
      const fH = parseFloat(fromCard.getAttribute('data-height') || 200);

      const tX = parseFloat(toCard.getAttribute('data-x') || 0);
      const tY = parseFloat(toCard.getAttribute('data-y') || 0);
      const tW = parseFloat(toCard.getAttribute('data-width') || BOX_WIDTH);
      const tH = parseFloat(toCard.getAttribute('data-height') || 200);

      // Bounding box of both connected cards
      const minX = Math.min(fX, tX);
      const minY = Math.min(fY, tY);
      const maxX = Math.max(fX + fW, tX + tW);
      const maxY = Math.max(fY + fH, tY + tH);

      const boundsWidth = Math.max(BOX_WIDTH, maxX - minX);
      const boundsHeight = Math.max(160, maxY - minY);
      const midX = minX + boundsWidth / 2;
      const midY = minY + boundsHeight / 2;

      const vpRect = viewport.getBoundingClientRect();
      const paddingX = 110;
      const paddingY = 90;
      const availWidth = Math.max(200, vpRect.width - paddingX * 2);
      const availHeight = Math.max(200, vpRect.height - paddingY * 2);

      const scaleX = availWidth / boundsWidth;
      const scaleY = availHeight / boundsHeight;
      const fitScale = Math.min(scaleX, scaleY);
      const targetScale = Math.max(0.45, Math.min(1.35, fitScale));

      const targetPointX = (vpRect.width / 2) - (midX * targetScale);
      const targetPointY = (vpRect.height / 2) - (midY * targetScale);

      // Lock in active focused edge spotlight
      activeFocusedEdge = edgeId;
      spotlightEdge(fromTable, fromField, toTable, toField);

      // Smooth camera pan and zoom transition directly to the link
      animateViewportTo(targetPointX, targetPointY, targetScale, 450);

      showToast(\`🎯 Focused link: \${fromTable}.\${fromField} ➔ \${toTable}.\${toField}\`);
    }

    // 7. Compact Mode for Large Databases (Shrinks cards to PK/FK only)
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
      showToast(isCompactMode ? '🗂️ Compact Mode (Keys only)' : '📋 Detailed Mode (All columns)');
    }

    // 8. Auto "Fit to Screen" Algorithm with Smooth Animation
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
      const midX = minX + graphW / 2;
      const midY = minY + graphH / 2;

      const vpRect = viewport.getBoundingClientRect();
      const scaleX = vpRect.width / graphW;
      const scaleY = vpRect.height / graphH;

      const targetScale = Math.min(Math.max(MIN_ZOOM, Math.min(scaleX, scaleY) * 0.94), 2.5);
      const targetPointX = (vpRect.width / 2) - (midX * targetScale);
      const targetPointY = (vpRect.height / 2) - (midY * targetScale);

      animateViewportTo(targetPointX, targetPointY, targetScale, 450);
    }

    // 9. Viewport Pan/Zoom & Pure Vector Crisp Transform
    function updateTransform() {
      if (stage) {
        stage.setAttribute('transform', \`translate(\${pointX}, \${pointY}) scale(\${scale})\`);
      }
      zoomValDisplay.textContent = Math.round(scale * 100) + '%';
      updateMinimapBox();
    }

    function setZoomScale(targetScale) {
      const vpRect = viewport.getBoundingClientRect();
      const cx = vpRect.width / 2;
      const cy = vpRect.height / 2;

      const xs = (cx - pointX) / scale;
      const ys = (cy - pointY) / scale;

      const newScale = Math.min(Math.max(MIN_ZOOM, targetScale), MAX_ZOOM);
      const newPointX = cx - xs * newScale;
      const newPointY = cy - ys * newScale;

      animateViewportTo(newPointX, newPointY, newScale, 300);
      if (zoomPresetsMenu) zoomPresetsMenu.style.display = 'none';
    }

    function toggleZoomPresetsMenu() {
      if (!zoomPresetsMenu) return;
      zoomPresetsMenu.style.display = zoomPresetsMenu.style.display === 'flex' ? 'none' : 'flex';
    }

    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.zoom-hud') || e.target.closest('#minimap') || e.target.closest('.table-card') || e.target.closest('#zoom-presets-menu')) return;
      if (currentAnimFrame) {
        cancelAnimationFrame(currentAnimFrame);
        currentAnimFrame = null;
      }
      isCanvasPanning = true;
      panStartX = e.clientX - pointX;
      panStartY = e.clientY - pointY;
    });

    // Mouse-centered smooth wheel zoom with zero blur
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const vpRect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - vpRect.left;
      const mouseY = e.clientY - vpRect.top;

      const xs = (mouseX - pointX) / scale;
      const ys = (mouseY - pointY) / scale;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.min(Math.max(MIN_ZOOM, scale * zoomFactor), MAX_ZOOM);

      pointX = mouseX - xs * newScale;
      pointY = mouseY - ys * newScale;
      scale = newScale;

      updateTransform();
    }, { passive: false });

    function zoomBy(delta) {
      const vpRect = viewport.getBoundingClientRect();
      const cx = vpRect.width / 2;
      const cy = vpRect.height / 2;

      const xs = (cx - pointX) / scale;
      const ys = (cy - pointY) / scale;

      const newScale = Math.min(Math.max(MIN_ZOOM, scale * (delta > 0 ? 1.25 : 0.8)), MAX_ZOOM);
      pointX = cx - xs * newScale;
      pointY = cy - ys * newScale;
      scale = newScale;

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
      scale = 1.0;
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

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        showToast('⛶ Fullscreen mode enabled');
      } else {
        document.exitFullscreen().catch(() => {});
        showToast('Exit Fullscreen mode');
      }
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.key === '[') {
        toggleSidebarDrawer();
      } else if (e.key === '+' || e.key === '=') {
        zoomBy(0.2);
      } else if (e.key === '-' || e.key === '_') {
        zoomBy(-0.2);
      } else if (e.key === '0') {
        resetCanvas();
      } else if (e.key.toLowerCase() === 'f') {
        fitToScreen();
      } else if (e.key === 'Escape') {
        clearModelSelection();
        if (zoomPresetsMenu) zoomPresetsMenu.style.display = 'none';
      }
    });

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
        card.style.opacity = !q || text.includes(q) ? '1' : '0.18';
      });
    }

    // 10. Interactive Minimap Radar
    function drawMinimap() {
      const canvas = document.getElementById('minimap-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width = 190;
      const h = canvas.height = 130;

      ctx.clearRect(0, 0, w, h);

      const cards = document.querySelectorAll('.table-card');
      if (cards.length === 0) return;

      let minX = 0, minY = 0, maxX = 1800, maxY = 1400;
      cards.forEach(card => {
        const x = parseFloat(card.getAttribute('data-x'));
        const y = parseFloat(card.getAttribute('data-y'));
        if (x + 320 > maxX) maxX = x + 320;
        if (y + 320 > maxY) maxY = y + 320;
      });

      const mScaleX = w / maxX;
      const mScaleY = h / maxY;

      cards.forEach(card => {
        const name = card.getAttribute('data-table');
        const x = parseFloat(card.getAttribute('data-x')) * mScaleX;
        const y = parseFloat(card.getAttribute('data-y')) * mScaleY;
        const cardW = (parseFloat(card.getAttribute('data-width')) || BOX_WIDTH) * mScaleX;
        const cardH = (parseFloat(card.getAttribute('data-height')) || 120) * mScaleY;

        if (name === selectedModel) {
          ctx.fillStyle = '#f38ba8';
        } else {
          ctx.fillStyle = '#89b4fa';
        }

        ctx.fillRect(x, y, Math.max(3, cardW), Math.max(2, cardH));
      });

      updateMinimapBox();
    }

    function updateMinimapBox() {
      const box = document.getElementById('minimap-box');
      const vpRect = viewport.getBoundingClientRect();
      const canvas = document.getElementById('minimap-canvas');
      if (!canvas || !box) return;

      const maxX = 1800, maxY = 1400;
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

      const maxX = 1800, maxY = 1400;
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

    // 11. Exports
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
