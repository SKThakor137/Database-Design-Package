# ⚡ schemagraph-core

> **Zero-Dependency Database Architecture & Relational ERD Generator for Node.js**
> Automatically scan and parse backend schemas (`.sql`, `.prisma`, `Mongoose`, `Sequelize`, `TypeORM`, `GraphQL`), map relational dependencies, and export responsive vector SVGs, interactive single-page HTML explorers, Mermaid diagrams, DBML, and normalized SQL DDL.

---

## 🌟 Why `schemagraph-core`?

- 🚫 **Zero External Dependencies**: Built strictly using pure Node.js standard library (`fs`, `path`, `crypto`, `events`, `os`). Never bloats your `node_modules` or suffers from upstream supply-chain vulnerabilities.
- 🎯 **Universal Multi-Dialect Support**: Automatically detects and parses:
  - **SQL DDL** (`CREATE TABLE`, `PRIMARY KEY`, `FOREIGN KEY ... REFERENCES`)
  - **Prisma Schema** (`model`, `@id`, `@unique`, `@relation(fields, references)`)
  - **Mongoose / MongoDB** (`new Schema({ ... })`, `ref: 'Model'`)
  - **Sequelize ORM** (`sequelize.define`, `Model.init`, `hasMany`, `belongsTo`)
  - **TypeORM** (`@Entity`, `@PrimaryGeneratedColumn`, `@ManyToOne`, `@JoinColumn`)
  - **GraphQL SDL** (`type Model { ... }`, object relations)
- 🎨 **7 Export Formats in One Command**:
  1. **Responsive XML SVG**: Modern dark & light developer themes (Catppuccin Mocha, Tokyo Dark, Slate Light), table cards, `[PK]` and `[FK]` badges, cubic bezier curves with directional arrows.
  2. **Interactive HTML Viewer**: Zero-dependency standalone single-page web app with smooth mouse pan/zoom, live table/column search filter, schema metrics, and instant SVG/PNG/JSON downloads.
  3. **Mermaid Markdown (`.md`)**: GitHub/GitLab native `erDiagram` markdown blocks + formatted data dictionary tables ready for `README.md`.
  4. **JSON Schema Map (`.json`)**: Machine-readable AST for CI/CD pipelines, documentation generators, or custom tooling.
  5. **DBML (`.dbml`)**: Standard Database Markup Language compatible with [dbdiagram.io](https://dbdiagram.io) and [dbdocs.io](https://dbdocs.io).
  6. **Graphviz DOT (`.dot`)**: Compatible with Graphviz tools and online graph visualizers.
  7. **Reconstructed SQL DDL (`.sql`)**: Clean, normalized standard SQL `CREATE TABLE` and constraint statements.

---

## 🚀 Quick Start

### 1. Installation

You can run it directly with `npx` or install globally:

```bash
# Direct execution (Zero install)
npx schemagraph-core ./src --format=all --output=./docs

# Or install globally
npm install -g schemagraph-core
```

Or link locally for development:
```bash
git clone https://github.com/your-username/schemagraph-core.git
cd schemagraph-core
npm link
```

---

## 💻 CLI Usage

```bash
schemagraph-core [targetDir] [options]
pure-erd [targetDir] [options]
```

### Options

| Flag | Shorthand | Default | Description |
| :--- | :--- | :--- | :--- |
| `--format` | `-f` | `svg,html` | Comma-separated list of formats: `svg`, `html`, `md`, `json`, `dbml`, `dot`, `sql`, or `all` |
| `--output` | `-o` | `.` | Target output directory for generated schema assets |
| `--theme` | `-t` | `catppuccin` | Visual theme for SVG & HTML (`catppuccin`, `dark`, `light`) |
| `--title` | | `Database Schema Topology` | Custom diagram title |
| `--exclude` | `-e` | `node_modules,.git,...` | Comma-separated list of directories to ignore |
| `--help` | `-h` | | Show help menu |
| `--version`| `-v` | | Display version number |

### Examples

```bash
# Scan current project and export default SVG & Interactive HTML
schemagraph-core

# Scan backend directory and export ALL 7 formats to ./docs
schemagraph-core ./backend --format=all --output=./docs

# Generate Catppuccin-themed SVG diagram with a custom title
schemagraph-core ./src/models -f svg -t catppuccin --title="E-Commerce Architecture"

# Generate GitHub-ready Mermaid ERD and DBML
schemagraph-core ./prisma -f md,dbml --output=./docs
```

---

## 📦 Programmatic API (Pure Node.js)

You can also use `schemagraph-core` as a library inside your Node.js scripts or build tools:

```javascript
const {
    parseProject,
    generateSVG,
    generateHTML,
    generateMarkdown,
    generateJSON,
    generateDBML,
    generateDOT,
    generateSQL
} = require('schemagraph-core');

// 1. Scan and parse workspace schema models
const schemaMap = parseProject('./src');

// 2. Generate SVG string
const svg = generateSVG(schemaMap, {
    theme: 'catppuccin', // 'catppuccin' | 'dark' | 'light'
    title: 'Application Database ERD'
});

// 3. Generate Interactive HTML Viewer
const html = generateHTML(schemaMap, {
    title: 'Relational Explorer'
});

// 4. Generate Mermaid Markdown
const markdown = generateMarkdown(schemaMap);

// 5. Generate JSON AST
const jsonAst = generateJSON(schemaMap);

// 6. Generate DBML
const dbml = generateDBML(schemaMap);

// 7. Generate SQL DDL
const sql = generateSQL(schemaMap);
```

---

## 🎨 Themes & Visual Styling

`schemagraph-core` comes with 3 built-in themes:

1. **Catppuccin Mocha (`catppuccin`)**: Soothing dark pastel palette with modern glowing accents.
2. **Tokyo Dark (`dark`)**: Deep slate blue background with vibrant electric blue headers and pink relationship lines.
3. **Slate Light (`light`)**: Clean, crisp white & indigo palette designed for print, reports, and light documentation wikis.

---

## 🧪 Testing

Run the zero-dependency test suite powered by native `node:test`:

```bash
npm test
```

---

## 📄 License

MIT License. Free for open-source and commercial use.
