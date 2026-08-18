# ⚡ schemagraph

<p align="center">
  <img src="./assets/database-design.svg" alt="schemagraph Relational ERD Preview" width="100%" />
</p>

<p align="center">
  <strong>Universal Zero-Dependency Database Architecture & Relational ERD Generator</strong><br>
  <em>Instantly scan backend schemas & frontend models across any framework, map relational dependencies, and generate responsive vector SVGs, interactive single-page HTML explorers, Mermaid diagrams, DBML, and SQL DDL.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/schemagraph"><img src="https://img.shields.io/npm/v/schemagraph.svg?color=38bdf8&style=flat-square" alt="npm version" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D16.0.0-68a063.svg?style=flat-square" alt="node version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/dependencies-0%20(Zero)-success.svg?style=flat-square" alt="Zero Dependencies" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
</p>

---

## ⚡ Instant Run (Single Command - No Install Needed)

Run `schemagraph` in your project folder right now with `npx`:

```bash
npx schemagraph
```

> 🌐 **Auto-Opens Browser**: Automatically scans your schemas, generates the core visual formats (`database-design.html` & `database-design.svg`), and launches the interactive explorer in your default browser! (Pass `--no-open` to suppress in CI/CD).
>
> 💡 **Optional Global Install**: `npm install -g schemagraph` (then run `schemagraph` anywhere).

---

## 🎯 Individual Format Commands (Export Only What You Need)

By default, `schemagraph` generates **HTML + SVG**. If you want specific formats, use `--format`:

```bash
# 📊 1. Generate DBML Schema (Ready for dbdiagram.io)
npx schemagraph --format=dbml

# 🐬 2. Generate Standard SQL DDL (CREATE TABLE & FOREIGN KEYs)
npx schemagraph --format=sql

# 🧜‍♂️ 3. Generate Mermaid Markdown (for GitHub README)
npx schemagraph --format=md

# 📋 4. Generate Machine-Readable JSON AST
npx schemagraph --format=json

# 🕸 5. Generate Graphviz DOT Digraph
npx schemagraph --format=dot

# 📦 6. Generate Multiple Specific Formats (Comma-separated)
npx schemagraph --format=dbml,sql,md --output=./docs

# 🚀 7. Generate ALL 7 Formats Simultaneously
npx schemagraph --format=all --output=./docs
```

---

## 🌟 Why schemagraph?

- 🚫 **Zero External Dependencies**: Built strictly using pure Node.js standard library (`fs`, `path`, `crypto`, `events`, `os`). Under **40 KB** install footprint. Zero supply-chain security risks.
- ⚡ **Instant Performance**: Scans and parses 50+ models and generates all diagrams in under **50 milliseconds**.
- 🎯 **Universal Multi-Framework Auto-Discovery**: Automatically detects and parses:
  - 🐘 **PHP / Laravel**: Migration files (`database/migrations/*.php` with `Schema::create`, `Blueprint`, `foreignId()`, `constrained()`) and Eloquent models (`belongsTo`, `hasMany`).
  - 🐍 **Python / Django & SQLAlchemy**: Django models (`models.Model`, `ForeignKey`) and SQLAlchemy (`Base`, `Column`, `ForeignKey`).
  - 💎 **Ruby on Rails**: Schema (`db/schema.rb`, `db/migrate/*.rb`), `create_table`, `add_foreign_key`, and ActiveRecord models (`belongs_to`, `has_many`).
  - 🐹 **Go / GORM**: Structs with `gorm:"primaryKey"`, `gorm:"foreignKey"`, and relationship fields.
  - ☕ **Java & Kotlin (Spring Boot)**: JPA / Hibernate `@Entity`, `@Table`, `@Id`, `@Column`, `@ManyToOne`, `@JoinColumn`.
  - ⚡ **Node.js & TypeScript**: Prisma (`.prisma`), Mongoose, Sequelize, TypeORM, GraphQL SDL (`.graphql`), TypeScript interfaces (`interface User`), Zod (`z.object`).
  - 🗄️ **Relational SQL DDL**: `.sql` files with `CREATE TABLE`, `PRIMARY KEY`, `FOREIGN KEY ... REFERENCES` for PostgreSQL, MySQL, SQLite, MariaDB.
- 🎨 **7 Output Formats**:
  1. **Responsive XML SVG**: Modern dark & light developer themes (*Catppuccin Mocha*, *Tokyo Dark*, *Slate Light*), table cards, `[PK]` and `[FK]` badges, cubic bezier curves.
  2. **Interactive Single-Page HTML Explorer**: Standalone web app with draggable cards, smooth camera transitions, multi-color wire distinction, connection inspector, minimap, and in-browser exports.
  3. **DBML (`.dbml`)**: Standard Database Markup Language compatible with [dbdiagram.io](https://dbdiagram.io) and [dbdocs.io](https://dbdocs.io).
  4. **Normalized SQL DDL (`.sql`)**: Clean, standard SQL `CREATE TABLE` and constraint statements.
  5. **Mermaid Markdown (`.md`)**: GitHub/GitLab native `erDiagram` block + formatted data dictionary tables ready for `README.md`.
  6. **JSON Schema Map (`.json`)**: Machine-readable AST for CI/CD pipelines, documentation generators, or scripts.
  7. **Graphviz DOT (`.dot`)**: Compatible with Graphviz graph engines (`dot`, `neato`, `d3-graphviz`).

---

## 📊 Live GitHub Mermaid ERD Demo

This diagram is rendered natively on GitHub using the Mermaid export produced by `schemagraph`:

```mermaid
erDiagram
    products ||--o{ categories : "category_id -> id"
    orders ||--o{ users : "user_id -> id"
    order_items ||--o{ orders : "order_id -> id"
    order_items ||--o{ products : "product_id -> id"
    reviews ||--o{ users : "user_id -> id"
    reviews ||--o{ products : "product_id -> id"

    users {
        SERIAL id PK
        VARCHAR_100_ name
        VARCHAR_255_ email
        VARCHAR_255_ password_hash
        VARCHAR_500_ avatar_url
        VARCHAR_20_ role
        TIMESTAMP created_at
    }
    categories {
        SERIAL id PK
        VARCHAR_100_ name
        VARCHAR_120_ slug
        TEXT description
    }
    products {
        SERIAL id PK
        INT category_id FK
        VARCHAR_200_ name
        VARCHAR_220_ slug
        DECIMAL_10__2_ price
        INT stock
        BOOLEAN is_active
        TIMESTAMP created_at
    }
    orders {
        SERIAL id PK
        INT user_id FK
        VARCHAR_50_ order_number
        DECIMAL_10__2_ total_amount
        VARCHAR_50_ status
        VARCHAR_50_ payment_status
        TEXT shipping_address
        TIMESTAMP created_at
    }
    order_items {
        SERIAL id PK
        INT order_id FK
        INT product_id FK
        INT quantity
        DECIMAL_10__2_ unit_price
    }
    reviews {
        SERIAL id PK
        INT user_id FK
        INT product_id FK
        INT rating
        TEXT comment
        TIMESTAMP created_at
    }
```

---

## 🌐 Interactive HTML Viewer Features

When you export with `--format=html` (or `all`), `schemagraph` produces a standalone, self-contained single-page web app with **zero CDN dependencies** (100% offline).

### Key Features:
- 🚀 **Zero-Blur Pure Vector Engine**: Crisp, sharp text and cards at any zoom level from 2% eagle-eye to 1000% ultra-close inspection.
- 🎯 **Smooth Animated Camera Navigation (`easeOutCubic`)**: Clicking **`🎯 Focus Link`** or **`Center Table`** smoothly glides and zooms the camera to frame connected tables at the exact center of your screen.
- 🌈 **Multi-Color Wire Distinction**: Relationship connectors use an 11-color deterministic palette so overlapping foreign keys are instantly distinguishable.
- 💡 **Single-Wire Persistent Spotlight**: Clicking a relation locks in a 5.5px neon glow spotlight while dimming unrelated tables and edges.
- 🖱️ **Real-Time Draggable Table Cards**: Reposition any table node freely; cubic Bézier connectors dynamically recalculate at 60fps.
- 🔍 **Docked Connection Inspector**: Click any table or press `[` to see all outgoing foreign keys and incoming referenced-by tables with cardinality badges.
- 🗂️ **Compact Mode for Large Schemas**: Shrinks table cards to PK/FK keys only for high-density 50+ table architectures.
- 🗺️ **Interactive Minimap Radar**: Eagle-eye minimap with click-to-jump radar view.
- ⬇ **1-Click Multi-Format Export Dropdown**: Download **SVG, PNG, DBML, SQL, Mermaid Markdown, JSON, and DOT** directly from the browser header.

---

## 💻 CLI Options Reference

```bash
schemagraph [targetDir] [options]
```

| Option | Flag | Default | Description |
| :--- | :--- | :--- | :--- |
| `--format` | `-f` | `svg,html` | Comma-separated: `svg`, `html`, `md`, `json`, `dbml`, `dot`, `sql`, or `all` |
| `--output` | `-o` | `.` | Target output directory for generated assets |
| `--theme` | `-t` | `catppuccin` | Visual theme: `catppuccin`, `dark`, or `light` |
| `--title` | | `Database Schema Topology` | Custom diagram header title |
| `--open` | | `true` | Automatically open HTML viewer in default browser |
| `--no-open`| | `false` | Disable automatic browser launch (useful for CI/CD) |
| `--exclude`| `-e` | `node_modules,.git,...` | Comma-separated directories to ignore |
| `--help` | `-h` | | Display help manual |
| `--version`| `-v` | | Display version number |

---

## 📦 Programmatic Node.js API

Use `schemagraph` directly in your Node.js scripts, migration hooks, or build pipelines:

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
} = require('schemagraph');

// 1. Scan and parse workspace schema models
const schemaMap = parseProject('./backend');

// 2. Generate Interactive HTML Viewer
const html = generateHTML(schemaMap, {
    title: 'Database Explorer'
});

// 3. Generate SVG string
const svg = generateSVG(schemaMap, {
    theme: 'catppuccin', // 'catppuccin' | 'dark' | 'light'
    title: 'Application Architecture'
});

// 4. Generate DBML (for dbdiagram.io)
const dbml = generateDBML(schemaMap);

// 5. Generate Standard SQL DDL
const sql = generateSQL(schemaMap);

// 6. Generate Mermaid Markdown
const markdown = generateMarkdown(schemaMap);

// 7. Generate JSON AST
const jsonAst = generateJSON(schemaMap);
```

---

## 🎨 Built-in Themes

| Theme | Identifier | Description |
| :--- | :--- | :--- |
| **Catppuccin Mocha** | `catppuccin` *(default)* | Soothing dark pastel palette with glowing accent connector lines. |
| **Tokyo Dark** | `dark` | Deep slate blue background with electric blue headers and pink relationship lines. |
| **Slate Light** | `light` | High-contrast clean indigo palette designed for print, PDFs, and light wikis. |

---

## 🤖 Continuous Integration & Automation Recipes

### Auto-generate ERD on Git Commit (Husky)
Add to your `package.json` scripts to keep docs in sync with your migrations automatically:
```json
{
  "scripts": {
    "docs:db": "schemagraph ./backend --format=all --output=./docs --no-open"
  }
}
```

### GitHub Actions Workflow
Automatically regenerate and commit updated diagrams when schema files change:
```yaml
name: Generate Database ERD
on:
  push:
    paths:
      - 'database/migrations/**'
      - 'prisma/**'
      - 'models/**'
      - 'migrations/**'

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx schemagraph ./ --format=all --output=./docs --no-open
      - name: Commit updated ERD
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/
          git commit -m "docs(db): update database architecture diagrams [skip ci]" || exit 0
          git push
```

---

## 🥊 Comparison with Other Tools

| Feature | `schemagraph` | prisma-erd-generator | dbdocs / dbml-cli | Graphviz (dot) |
| :--- | :---: | :---: | :---: | :---: |
| **External Dependencies** | **0 (Zero)** | 15+ npm packages | 20+ npm packages | Requires C++ Binary |
| **Universal Multi-Framework Support** | **Laravel, Django, Rails, Go, Spring, Prisma, Mongoose, Sequelize, TypeORM, GraphQL, SQL** | Prisma Only | DBML Only | DOT only |
| **Output Formats** | **7 Formats** (SVG, HTML, MD, JSON, DBML, DOT, SQL) | SVG / PNG | Web / DBML | SVG / PNG |
| **Interactive HTML App** | **Yes** (Zero-blur, 60fps Animation, Minimap) | No | Web Hosted | No |
| **In-Browser Multi-Format Download** | **Yes** (1-Click SVG/PNG/DBML/SQL/MD/JSON/DOT) | No | No | No |
| **Execution Speed** | **< 50ms** | ~2000ms | ~1500ms | ~800ms |
| **Offline / Air-gapped** | **100% Offline** | Partial | Needs Internet | Offline |

---

## 📄 License

MIT License © 2026 [Shailesh Thakor](https://github.com/SKThakor137)
