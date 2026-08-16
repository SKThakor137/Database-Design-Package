/**
 * Spatial Layout & Connector Engine
 * Computes table box coordinates, column anchor points, and bezier relationship paths.
 * Pure Node.js - Zero dependencies.
 */

class LayoutEngine {
    static computeLayout(schemaMap, options = {}) {
        const tableNames = Object.keys(schemaMap);
        if (tableNames.length === 0) {
            return { positions: {}, connectors: [], width: 800, height: 600 };
        }

        const boxWidth = options.boxWidth || 280;
        const rowHeight = options.rowHeight || 28;
        const headerHeight = options.headerHeight || 46;
        const paddingX = options.paddingX || 90;
        const paddingY = options.paddingY || 70;
        const marginX = options.marginX || 80;
        const marginTop = options.marginTop || 110; // Generous space for diagram title header

        // Choose number of columns dynamically based on model count
        let numCols = 3;
        if (tableNames.length <= 2) numCols = 2;
        else if (tableNames.length <= 4) numCols = 2;
        else if (tableNames.length <= 8) numCols = 3;
        else if (tableNames.length <= 16) numCols = 4;
        else numCols = Math.min(5, Math.ceil(Math.sqrt(tableNames.length)));

        // Column tracking for masonry-style vertical packing
        const colHeights = new Array(numCols).fill(marginTop);
        const positions = {};

        // 1. Assign (x, y) positions to tables
        tableNames.forEach((tableName, index) => {
            const table = schemaMap[tableName];
            const colCount = Math.max(1, table.columns.length);
            const boxHeight = headerHeight + (colCount * rowHeight) + 16;

            // Pick the column with the minimum height for balanced masonry packing
            let bestCol = 0;
            for (let c = 1; c < numCols; c++) {
                if (colHeights[c] < colHeights[bestCol]) {
                    bestCol = c;
                }
            }

            const x = marginX + bestCol * (boxWidth + paddingX);
            const y = colHeights[bestCol];

            positions[tableName] = {
                x,
                y,
                width: boxWidth,
                height: boxHeight,
                colIndex: bestCol
            };

            colHeights[bestCol] += boxHeight + paddingY;
        });

        const maxX = marginX + numCols * (boxWidth + paddingX);
        const maxY = Math.max(...colHeights) + 80;

        const width = Math.max(1100, maxX);
        const height = Math.max(750, maxY);

        // 2. Compute relationship connectors with exact column ports
        const connectors = [];

        tableNames.forEach(fromTableName => {
            const fromTable = schemaMap[fromTableName];
            const fromPos = positions[fromTableName];
            if (!fromPos) return;

            fromTable.relations.forEach(rel => {
                const toTableName = rel.toTable;
                const toPos = positions[toTableName];
                if (!toPos) return; // Target table not in scanned models

                const toTable = schemaMap[toTableName];

                // Find column indices
                const fromColIdx = fromTable.columns.findIndex(c => c.name === rel.from);
                const toColIdx = toTable ? toTable.columns.findIndex(c => c.name === rel.toField) : -1;

                const fromY = fromPos.y + headerHeight + (fromColIdx >= 0 ? fromColIdx * rowHeight + rowHeight / 2 : 20);
                const toY = toPos.y + headerHeight + (toColIdx >= 0 ? toColIdx * rowHeight + rowHeight / 2 : 20);

                // Determine best connector sides (left vs right)
                let startX, endX;
                if (fromPos.x < toPos.x) {
                    startX = fromPos.x + boxWidth;
                    endX = toPos.x;
                } else if (fromPos.x > toPos.x) {
                    startX = fromPos.x;
                    endX = toPos.x + boxWidth;
                } else {
                    // Same column
                    startX = fromPos.x + boxWidth;
                    endX = toPos.x + boxWidth;
                }

                // Cubic Bezier control points
                const dx = Math.max(50, Math.abs(endX - startX) * 0.5);
                const cp1x = startX < endX ? startX + dx : startX - dx;
                const cp1y = fromY;
                const cp2x = startX < endX ? endX - dx : endX + dx;
                const cp2y = toY;

                const pathData = `M ${startX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${toY}`;

                connectors.push({
                    fromTable: fromTableName,
                    fromField: rel.from,
                    toTable: toTableName,
                    toField: rel.toField,
                    cardinality: rel.cardinality || 'N:1',
                    startX,
                    startY: fromY,
                    endX,
                    endY: toY,
                    pathData
                });
            });
        });

        return {
            positions,
            connectors,
            width,
            height,
            boxWidth,
            headerHeight,
            rowHeight
        };
    }
}

module.exports = LayoutEngine;
