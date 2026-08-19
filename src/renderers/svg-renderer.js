/**
 * Vector SVG Graph Renderer
 * Generates standalone, ultra-crisp, responsive XML SVG diagrams with modern developer aesthetics.
 * Pure Node.js - Zero dependencies.
 */

const LayoutEngine = require('../layout/layout-engine');

const THEMES = {
    catppuccin: {
        bg: '#181825',
        dotGrid: '#313244',
        cardBg: '#1e1e2e',
        cardStroke: '#45475a',
        cardHeaderStart: '#89b4fa',
        cardHeaderEnd: '#74c7ec',
        headerText: '#11111b',
        headerBadgeBg: 'rgba(17, 17, 27, 0.2)',
        headerBadgeText: '#11111b',
        colText: '#cdd6f4',
        typeText: '#9399b2',
        rowDivider: '#313244',
        pkBg: '#f9e2af',
        pkText: '#1e1e2e',
        fkBg: '#cba6f7',
        fkText: '#1e1e2e',
        edgeStroke: '#f38ba8',
        edgeGlow: 'rgba(243, 139, 168, 0.3)',
        titleText: '#cdd6f4',
        subText: '#a6adc8'
    },
    dark: {
        bg: '#0f172a',
        dotGrid: '#1e293b',
        cardBg: '#1e293b',
        cardStroke: '#334155',
        cardHeaderStart: '#3b82f6',
        cardHeaderEnd: '#2563eb',
        headerText: '#ffffff',
        headerBadgeBg: 'rgba(255, 255, 255, 0.2)',
        headerBadgeText: '#ffffff',
        colText: '#f8fafc',
        typeText: '#94a3b8',
        rowDivider: '#334155',
        pkBg: '#eab308',
        pkText: '#0f172a',
        fkBg: '#a855f7',
        fkText: '#ffffff',
        edgeStroke: '#ec4899',
        edgeGlow: 'rgba(236, 72, 153, 0.3)',
        titleText: '#f8fafc',
        subText: '#64748b'
    },
    light: {
        bg: '#f8fafc',
        dotGrid: '#e2e8f0',
        cardBg: '#ffffff',
        cardStroke: '#cbd5e1',
        cardHeaderStart: '#4f46e5',
        cardHeaderEnd: '#6366f1',
        headerText: '#ffffff',
        headerBadgeBg: 'rgba(255, 255, 255, 0.25)',
        headerBadgeText: '#ffffff',
        colText: '#1e293b',
        typeText: '#64748b',
        rowDivider: '#f1f5f9',
        pkBg: '#fef08a',
        pkText: '#854d0e',
        fkBg: '#e9d5ff',
        fkText: '#6b21a8',
        edgeStroke: '#e11d48',
        edgeGlow: 'rgba(225, 29, 72, 0.2)',
        titleText: '#0f172a',
        subText: '#64748b'
    }
};

const EDGE_PALETTE = [
    '#89b4fa', // Vibrant Blue
    '#a6e3a1', // Emerald Green
    '#cba6f7', // Lavender Purple
    '#fab387', // Peach Orange
    '#89dceb', // Sky Cyan
    '#f38ba8', // Rose Pink
    '#f9e2af', // Gold Yellow
    '#94e2d5', // Mint Teal
    '#f5c2e7', // Flamingo Pink
    '#b4befe', // Indigo
    '#eba0ac'  // Coral
];

class SVGRenderer {
    static getEdgeColor(fromTable, fromField, toTable, toField, index) {
        if (typeof index === 'number') {
            return EDGE_PALETTE[index % EDGE_PALETTE.length];
        }
        const str = `${fromTable}.${fromField}->${toTable}.${toField}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return EDGE_PALETTE[Math.abs(hash) % EDGE_PALETTE.length];
    }

    static generateSVG(schemaMap, options = {}) {
        const themeName = (options.theme || 'catppuccin').toLowerCase();
        const theme = THEMES[themeName] || THEMES.catppuccin;
        const title = options.title || 'Database Schema Topology';

        const layout = LayoutEngine.computeLayout(schemaMap, {
            boxWidth: 280,
            rowHeight: 28,
            headerHeight: 46,
            paddingX: 90,
            paddingY: 70,
            margin: 80
        });

        const { width, height, positions, connectors, boxWidth, headerHeight, rowHeight } = layout;

        let markersXml = EDGE_PALETTE.map((color, cIdx) => `
      <marker id="arrowHead-${cIdx}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="${color}" />
      </marker>`).join('');

        let defsXml = `
    <defs>
      <!-- Background Dot Grid Pattern -->
      <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.2" fill="${theme.dotGrid}" />
      </pattern>

      <!-- Arrow Marker Default -->
      <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="${theme.edgeStroke}" />
      </marker>
      
      <marker id="arrowHeadHighlight" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#89b4fa" />
      </marker>
${markersXml}

      <!-- Header Gradient -->
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.cardHeaderStart}"/>
        <stop offset="100%" stop-color="${theme.cardHeaderEnd}"/>
      </linearGradient>
    </defs>`;

        // Title and Stats Header
        const totalModels = Object.keys(schemaMap).length;
        const totalRelations = connectors.length;
        let titleXml = `
    <!-- Diagram Title & Stats -->
    <g transform="translate(80, 45)" class="diagram-header">
      <text x="0" y="0" fill="${theme.titleText}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" letter-spacing="-0.5">${SVGRenderer.escapeXml(title)}</text>
      <text x="0" y="20" fill="${theme.subText}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">${totalModels} Models • ${totalRelations} Relationships • Generated by schemagraph</text>
    </g>`;

        // Connector Edges (Paths) with Distinct Colors
        let edgesXml = '    <!-- Relationship Connectors -->\n    <g class="relationships" id="svg-relationships">\n';
        connectors.forEach((conn, idx) => {
            const edgeId = `edge-${conn.fromTable}-${conn.fromField}-${conn.toTable}-${conn.toField}`;
            const colorIdx = idx % EDGE_PALETTE.length;
            const edgeColor = EDGE_PALETTE[colorIdx];

            edgesXml += `      <path id="${edgeId}" class="rel-edge" data-from="${conn.fromTable}" data-to="${conn.toTable}" data-from-field="${conn.fromField}" data-to-field="${conn.toField}" data-cardinality="${conn.cardinality || 'N:1'}" data-color="${edgeColor}" data-color-idx="${colorIdx}" d="${conn.pathData}" fill="none" stroke="${edgeColor}" stroke-width="2.5" stroke-dasharray="6 3" marker-end="url(#arrowHead-${colorIdx})" opacity="0.88" style="transition: stroke 0.15s, stroke-width 0.15s, opacity 0.15s; cursor: pointer;"/>\n`;
            edgesXml += `      <circle id="anchor-start-${edgeId}" class="rel-anchor rel-anchor-start" data-edge="${edgeId}" cx="${conn.startX}" cy="${conn.startY}" r="4.5" fill="${edgeColor}" style="transition: fill 0.15s, opacity 0.15s;"/>\n`;
            edgesXml += `      <circle id="anchor-end-${edgeId}" class="rel-anchor rel-anchor-end" data-edge="${edgeId}" cx="${conn.endX}" cy="${conn.endY}" r="4.5" fill="${edgeColor}" style="transition: fill 0.15s, opacity 0.15s;"/>\n`;
        });
        edgesXml += '    </g>\n';

        // Table Node Cards
        let nodesXml = '    <!-- Table Model Cards -->\n    <g class="tables" id="svg-tables">\n';

        Object.keys(schemaMap).forEach(tableName => {
            const table = schemaMap[tableName];
            const pos = positions[tableName];
            if (!pos) return;

            const colCount = Math.max(1, table.columns.length);
            const cardHeight = headerHeight + (colCount * rowHeight) + 12;

            nodesXml += `      <g id="card-${tableName}" class="table-card" data-table="${tableName}" data-x="${pos.x}" data-y="${pos.y}" data-width="${boxWidth}" data-height="${cardHeight}" transform="translate(${pos.x}, ${pos.y})" style="cursor: grab;">\n`;
            // Card background
            nodesXml += `        <rect class="card-bg" width="${boxWidth}" height="${cardHeight}" rx="10" fill="${theme.cardBg}" stroke="${theme.cardStroke}" stroke-width="1.5" style="transition: stroke 0.15s, stroke-width 0.15s;"/>\n`;

            // Card Header Bar (Rounded top)
            nodesXml += `        <path class="card-header" d="M 0 10 A 10 10 0 0 1 10 0 L ${boxWidth - 10} 0 A 10 10 0 0 1 ${boxWidth} 10 L ${boxWidth} ${headerHeight} L 0 ${headerHeight} Z" fill="url(#headerGrad)"/>\n`;

            // Table Title
            nodesXml += `        <text class="card-title" x="14" y="28" fill="${theme.headerText}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" letter-spacing="-0.2">${SVGRenderer.escapeXml(tableName)}</text>\n`;

            // Model Type Pill Badge (e.g. SQL, PRISMA, MONGOOSE)
            const badgeLabel = (table.sourceType || 'TABLE').toUpperCase();
            nodesXml += `        <rect x="${boxWidth - 70}" y="14" width="56" height="18" rx="4" fill="${theme.headerBadgeBg}"/>\n`;
            nodesXml += `        <text x="${boxWidth - 42}" y="27" fill="${theme.headerBadgeText}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="700" text-anchor="middle">${badgeLabel}</text>\n`;

            // Columns
            table.columns.forEach((col, cIdx) => {
                const rowY = headerHeight + (cIdx * rowHeight);
                const textY = rowY + 18;

                // Check if this column has an outgoing relation
                const rel = table.relations.find(r => (r.from === col.name || r.fromColumn === col.name));
                const toTable = rel ? rel.toTable : '';
                const toField = rel ? (rel.toField || rel.toColumn || 'id') : '';
                const fkTargetAttr = rel ? ` data-fk-target="${toTable}.${toField}"` : '';

                // Subtle row divider line (except last row)
                if (cIdx > 0) {
                    nodesXml += `        <line class="row-divider" data-row-idx="${cIdx}" x1="8" y1="${rowY}" x2="${boxWidth - 8}" y2="${rowY}" stroke="${theme.rowDivider}" stroke-width="1" opacity="0.6"/>\n`;
                }

                const isFk = !!(col.isForeign || rel);
                const isKey = col.isPrimary || isFk;
                const keyAttr = ` data-is-key="${isKey ? 'true' : 'false'}" data-orig-y="${rowY}"`;

                // Row hover hit area
                nodesXml += `        <g class="card-col-row" data-col="${SVGRenderer.escapeXml(col.name)}"${fkTargetAttr}${keyAttr}>\n`;
                nodesXml += `          <rect class="col-row-bg" x="4" y="${rowY + 2}" width="${boxWidth - 8}" height="${rowHeight - 4}" rx="4" fill="transparent" style="cursor: pointer;"/>\n`;

                let badgeOffset = 14;

                // PK / FK Badge Pills (Support composite PK + FK)
                if (col.isPrimary) {
                    nodesXml += `          <rect x="${badgeOffset}" y="${rowY + 6}" width="22" height="15" rx="3" fill="${theme.pkBg}"/>\n`;
                    nodesXml += `          <text x="${badgeOffset + 11}" y="${rowY + 17}" fill="${theme.pkText}" font-family="monospace" font-size="8.5" font-weight="bold" text-anchor="middle">PK</text>\n`;
                    badgeOffset += 28;
                }
                if (isFk) {
                    nodesXml += `          <rect x="${badgeOffset}" y="${rowY + 6}" width="22" height="15" rx="3" fill="${theme.fkBg}"/>\n`;
                    nodesXml += `          <text x="${badgeOffset + 11}" y="${rowY + 17}" fill="${theme.fkText}" font-family="monospace" font-size="8.5" font-weight="bold" text-anchor="middle">FK</text>\n`;
                    badgeOffset += 28;
                }

                // Column Name
                const colNameEscaped = SVGRenderer.escapeXml(col.name);
                nodesXml += `          <text class="col-name-text" x="${badgeOffset}" y="${textY}" fill="${theme.colText}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">${colNameEscaped}</text>\n`;

                // Column Type (Right-aligned)
                const colTypeEscaped = SVGRenderer.escapeXml(col.type || 'any');
                nodesXml += `          <text class="col-type-text" x="${boxWidth - 14}" y="${textY}" fill="${theme.typeText}" font-family="SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace" font-size="10.5" text-anchor="end">${colTypeEscaped}</text>\n`;
                nodesXml += `        </g>\n`;
            });

            nodesXml += `      </g>\n`;
        });
        nodesXml += '    </g>\n';

        const viewBoxAttr = options.interactive ? '' : `viewBox="0 0 ${width} ${height}" `;
        return `<svg id="schemagraph-svg" xmlns="http://www.w3.org/2000/svg" ${viewBoxAttr}width="100%" height="100%" style="background:${theme.bg}; user-select:none; shape-rendering:geometricPrecision; text-rendering:geometricPrecision;">\n` +
               defsXml + '\n' +
               `  <!-- Grid Background -->\n  <rect width="100%" height="100%" fill="url(#dotGrid)" />\n` +
               `  <g id="canvas-stage">\n` +
               titleXml + '\n' +
               edgesXml +
               nodesXml +
               `  </g>\n` +
               `</svg>`;
    }

    static escapeXml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}

module.exports = SVGRenderer;
