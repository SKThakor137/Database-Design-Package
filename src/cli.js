/**
 * CLI Command Runner
 * Pure Node.js zero-dependency argument parser and generator runner.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const UniversalSchemaParser = require('./parser/universal-parser');
const SVGRenderer = require('./renderers/svg-renderer');
const HTMLRenderer = require('./renderers/html-renderer');
const MermaidRenderer = require('./renderers/mermaid-renderer');
const JSONRenderer = require('./renderers/json-renderer');
const DBMLRenderer = require('./renderers/dbml-renderer');
const DOTRenderer = require('./renderers/dot-renderer');
const SQLRenderer = require('./renderers/sql-renderer');

function printBanner() {
    console.log('\x1b[36m%s\x1b[0m', `
   _____      __                         ______                 __  
  / ___/_____/ /_  ___  ____ ___  ____ _/ ____/________ _____  / /_ 
  \\__ \\/ ___/ __ \\/ _ \\/ __ \`__ \\/ __ \`/ / __/ ___/ __ \`/ __ \\/ __ \\
 ___/ / /__/ / / /  __/ / / / / / /_/ / /_/ / /  / /_/ / /_/ / / / /
/____/\\___/_/ /_/\\___/_/ /_/ /_/\\__,_/\\____/_/   \\__,_/ .___/_/ /_/ 
                                                     /_/            
  ⚡ Universal Multi-Framework Database Architecture & ERD Generator
    `);
}

function printHelp() {
    printBanner();
    console.log(`
Usage:
  schemagraph [targetDir] [options]
  pure-erd [targetDir] [options]

Arguments:
  targetDir                 Target project directory to scan (default: current directory)

Options:
  -f, --format <formats>    Comma-separated output formats: svg, html, md, json, dbml, dot, sql, all
                            (default: "svg,html")
  -o, --output <dir>        Output directory for generated files (default: current directory)
  -t, --theme <theme>       Visual theme for SVG/HTML: catppuccin, dark, light (default: "catppuccin")
      --title <title>       Custom title for the diagram (default: "Database Schema Topology")
      --open                Automatically open the interactive HTML viewer in browser (default: true)
      --no-open             Disable automatic browser opening
  -e, --exclude <dirs>      Comma-separated list of directories to exclude
  -h, --help                Show this help message and exit
  -v, --version             Show version number and exit

Universal Multi-Framework Auto-Discovery:
  • PHP / Laravel:          database/migrations/*.php (Schema::create), Eloquent models
  • Python / Django & SQLA: models.py (models.Model), SQLAlchemy (Base, Column)
  • Ruby on Rails:          db/schema.rb, db/migrate/*.rb, ActiveRecord models
  • Go / GORM:              *.go structs with gorm tags and relationships
  • Java & Kotlin (Spring): JPA @Entity, @Table, @Column, @ManyToOne, @JoinColumn
  • Node.js & TypeScript:   Prisma (.prisma), Mongoose, Sequelize, TypeORM, GraphQL, Zod, TS Types
  • Relational DDL:         PostgreSQL, MySQL, SQLite, MariaDB (.sql)

Examples:
  $ schemagraph
  $ schemagraph ./backend --format=all --output=./docs
  $ schemagraph ./database/migrations -f svg,html,md -t dark --title="Laravel Backend"
  $ schemagraph ./src/models -f svg,html,md -t dark --title="E-Commerce Schema"
`);
}

function openInBrowser(filePath) {
    const platform = process.platform;
    let command;

    if (platform === 'win32') {
        command = `start "" "${filePath}"`;
    } else if (platform === 'darwin') {
        command = `open "${filePath}"`;
    } else {
        command = `xdg-open "${filePath}"`;
    }

    try {
        exec(command, () => {});
    } catch (_) {
        // Silently ignore if headless environment
    }
}

function parseArgs(args) {
    const options = {
        targetDir: '.',
        formats: ['svg', 'html'],
        outputDir: '.',
        theme: 'catppuccin',
        title: 'Database Schema Topology',
        exclude: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', 'vendor', '__pycache__', '.venv', 'venv', 'target'],
        open: true,
        help: false,
        version: false
    };

    let i = 0;
    while (i < args.length) {
        const arg = args[i];

        if (arg === '-h' || arg === '--help') {
            options.help = true;
        } else if (arg === '-v' || arg === '--version') {
            options.version = true;
        } else if (arg === '-f' || arg === '--format') {
            options.formats = (args[++i] || '').split(',').map(s => s.trim().toLowerCase());
        } else if (arg.startsWith('--format=')) {
            options.formats = arg.substring(9).split(',').map(s => s.trim().toLowerCase());
        } else if (arg === '-o' || arg === '--output') {
            options.outputDir = args[++i] || '.';
        } else if (arg.startsWith('--output=')) {
            options.outputDir = arg.substring(9);
        } else if (arg === '-t' || arg === '--theme') {
            options.theme = args[++i] || 'catppuccin';
        } else if (arg.startsWith('--theme=')) {
            options.theme = arg.substring(8);
        } else if (arg.startsWith('--title=')) {
            options.title = arg.substring(8);
        } else if (arg === '--title') {
            options.title = args[++i] || options.title;
        } else if (arg === '--open') {
            options.open = true;
        } else if (arg === '--no-open') {
            options.open = false;
        } else if (arg === '-e' || arg === '--exclude') {
            const ex = (args[++i] || '').split(',').map(s => s.trim());
            options.exclude.push(...ex);
        } else if (arg.startsWith('--exclude=')) {
            const ex = arg.substring(10).split(',').map(s => s.trim());
            options.exclude.push(...ex);
        } else if (!arg.startsWith('-')) {
            options.targetDir = arg;
        }
        i++;
    }

    if (options.formats.includes('all')) {
        options.formats = ['svg', 'html', 'md', 'json', 'dbml', 'dot', 'sql'];
    }

    return options;
}

function runCLI() {
    const rawArgs = process.argv.slice(2);
    const options = parseArgs(rawArgs);

    if (options.help) {
        printHelp();
        process.exit(0);
    }

    if (options.version) {
        const pkg = require('../package.json');
        console.log(`schemagraph v${pkg.version}`);
        process.exit(0);
    }

    printBanner();

    const targetPath = path.resolve(process.cwd(), options.targetDir);
    const outPath = path.resolve(process.cwd(), options.outputDir);

    if (!fs.existsSync(targetPath)) {
        console.error(`\x1b[31m✖ Error: Target directory does not exist: ${targetPath}\x1b[0m\n`);
        process.exit(1);
    }

    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath, { recursive: true });
    }

    console.log(`🔍 Scanning project files for schemas inside: \x1b[33m${targetPath}\x1b[0m`);
    const startTime = Date.now();

    const parser = new UniversalSchemaParser({ exclude: options.exclude });
    const schemaMap = parser.scanDirectory(targetPath);

    const modelNames = Object.keys(schemaMap);
    if (modelNames.length === 0) {
        console.log('\x1b[33m⚠️  No supported database schemas or data models found in this directory.\x1b[0m\n');
        console.log('   \x1b[1mWhat was checked across all ecosystems:\x1b[0m');
        console.log('   • PHP / Laravel:          database/migrations/*.php, Eloquent Models');
        console.log('   • Python / Django & SQLA: models.py, SQLAlchemy Base / Column');
        console.log('   • Ruby on Rails:          db/schema.rb, db/migrate/*.rb, ActiveRecord');
        console.log('   • Go / GORM:              *.go structs with gorm tags');
        console.log('   • Java & Kotlin (Spring): JPA @Entity, @Table, @Column, @ManyToOne');
        console.log('   • Node.js & TypeScript:   Prisma, Mongoose, Sequelize, TypeORM, GraphQL, Zod, TS Types');
        console.log('   • Relational SQL:         SQL DDL (.sql) with CREATE TABLE / FOREIGN KEY\n');
        console.log('   \x1b[1m💡 How to resolve:\x1b[0m');
        console.log('   1. If your models/migrations are in a subdirectory (e.g. database/migrations or app/models), pass the path:');
        console.log('      \x1b[36mschemagraph ./database/migrations --format=all --output=./docs\x1b[0m');
        console.log('   2. If you have a standalone schema file, pass it directly:');
        console.log('      \x1b[36mschemagraph ./schema.sql\x1b[0m\n');
        return;
    }

    const totalRelations = modelNames.reduce((acc, t) => acc + schemaMap[t].relations.length, 0);
    const totalColumns = modelNames.reduce((acc, t) => acc + schemaMap[t].columns.length, 0);

    console.log(`📦 Found \x1b[32m${modelNames.length} data models\x1b[0m with \x1b[32m${totalColumns} columns\x1b[0m and \x1b[32m${totalRelations} relationships\x1b[0m.`);
    console.log(`🎨 Generating outputs for formats: \x1b[35m${options.formats.join(', ')}\x1b[0m\n`);

    const renderOptions = {
        title: options.title,
        theme: options.theme
    };

    const generatedFiles = [];
    let htmlGeneratedPath = null;

    if (options.formats.includes('svg')) {
        const svg = SVGRenderer.generateSVG(schemaMap, renderOptions);
        const svgFile = path.join(outPath, 'database-design.svg');
        fs.writeFileSync(svgFile, svg, 'utf-8');
        generatedFiles.push({ format: 'SVG Diagram', path: svgFile });
    }

    if (options.formats.includes('html')) {
        const html = HTMLRenderer.generateHTML(schemaMap, renderOptions);
        const htmlFile = path.join(outPath, 'database-design.html');
        fs.writeFileSync(htmlFile, html, 'utf-8');
        generatedFiles.push({ format: 'Interactive HTML Viewer', path: htmlFile });
        htmlGeneratedPath = htmlFile;
    }

    if (options.formats.includes('md')) {
        const md = MermaidRenderer.generateMarkdown(schemaMap, renderOptions);
        const mdFile = path.join(outPath, 'database-design.md');
        fs.writeFileSync(mdFile, md, 'utf-8');
        generatedFiles.push({ format: 'Mermaid ERD Markdown', path: mdFile });
    }

    if (options.formats.includes('json')) {
        const json = JSONRenderer.generateJSON(schemaMap, renderOptions);
        const jsonFile = path.join(outPath, 'database-design.json');
        fs.writeFileSync(jsonFile, json, 'utf-8');
        generatedFiles.push({ format: 'JSON Schema Map', path: jsonFile });
    }

    if (options.formats.includes('dbml')) {
        const dbml = DBMLRenderer.generateDBML(schemaMap, renderOptions);
        const dbmlFile = path.join(outPath, 'database-design.dbml');
        fs.writeFileSync(dbmlFile, dbml, 'utf-8');
        generatedFiles.push({ format: 'DBML (dbdiagram.io)', path: dbmlFile });
    }

    if (options.formats.includes('dot')) {
        const dot = DOTRenderer.generateDOT(schemaMap, renderOptions);
        const dotFile = path.join(outPath, 'database-design.dot');
        fs.writeFileSync(dotFile, dot, 'utf-8');
        generatedFiles.push({ format: 'Graphviz DOT File', path: dotFile });
    }

    if (options.formats.includes('sql')) {
        const sql = SQLRenderer.generateSQL(schemaMap, renderOptions);
        const sqlFile = path.join(outPath, 'database-design.sql');
        fs.writeFileSync(sqlFile, sql, 'utf-8');
        generatedFiles.push({ format: 'Standard SQL DDL', path: sqlFile });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\x1b[32m✨ Done in ${elapsed}s! Generated ${generatedFiles.length} schema assets:\x1b[0m`);
    generatedFiles.forEach(file => {
        console.log(`   ✔ \x1b[36m${file.format.padEnd(25)}\x1b[0m -> \x1b[37m${file.path}\x1b[0m`);
    });

    if (htmlGeneratedPath && options.open && !process.env.CI) {
        console.log(`\n🚀 \x1b[35mOpening interactive ERD explorer in your default browser...\x1b[0m`);
        openInBrowser(htmlGeneratedPath);
    }
    console.log('');
}

module.exports = { runCLI, parseArgs, openInBrowser };
