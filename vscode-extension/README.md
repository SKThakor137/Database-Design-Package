# ⚡ SchemaGraph for VS Code, Cursor, Windsurf & Antigravity IDE

**Interactive Live Database Schema Visualizer, Relational ERD Explorer & AI Context Generator directly inside your Editor.**

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/schemagraph.schemagraph-vscode?color=38bdf8&style=flat-square)](https://marketplace.visualstudio.com/)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/schemagraph.schemagraph-vscode?style=flat-square)](https://marketplace.visualstudio.com/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0%20(Zero)-success.svg?style=flat-square)](https://github.com/SKThakor137/Database-Design-Package)

---

## 🌟 Features

- ⚡ **Zero External Dependencies**: Built with pure Node.js standard libraries. Super lightweight and blazing fast.
- 🎯 **Multi-Framework Auto-Discovery**: Automatically scans and maps schemas across:
  - 🐘 **PHP / Laravel**: Migrations (`Blueprint`, `foreignId()`, `constrained()`) and Eloquent models.
  - 🐍 **Python**: Django models (`models.Model`, `ForeignKey`) and SQLAlchemy (`Base`, `ForeignKey`).
  - 💎 **Ruby on Rails**: `db/schema.rb`, `create_table`, `add_foreign_key`, ActiveRecord.
  - 🐹 **Go / GORM**: Structs with `gorm:"foreignKey"` and relationship fields.
  - ☕ **Java & Kotlin / Spring Boot**: JPA / Hibernate `@Entity`, `@ManyToOne`, `@JoinColumn`.
  - ⚡ **Node.js & TypeScript**: Prisma (`.prisma`), Mongoose, Sequelize, TypeORM, GraphQL SDL (`.graphql`), TypeScript interfaces (`interface User`), Zod (`z.object`).
  - 🗄️ **Relational SQL DDL**: `.sql` files with `CREATE TABLE`, `PRIMARY KEY`, `FOREIGN KEY`.
- 🔄 **Live Hot-Reloading**: Automatically refreshes the ERD diagram in a side-by-side tab whenever you edit and save model files.
- 🎨 **Modern Themes**: *Catppuccin Mocha*, *Tokyo Dark*, and *Slate Light*.
- 🤖 **1-Click AI Context Generation**: Copy complete token-optimized database architecture prompts directly for ChatGPT, Gemini, Claude, and Cursor.
- ⬇️ **Multi-Format Export**: Export to **SVG, HTML, DBML, SQL, Mermaid Markdown, JSON, and Graphviz DOT** with a single click.

---

## 🚀 How to Use

1. Open any project workspace in **VS Code**, **Cursor**, **Windsurf**, or **Antigravity IDE**.
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and run:
   ```
   SchemaGraph: Open Live ERD Visualizer
   ```
3. Or click the **`⚡ SchemaGraph`** icon in the status bar or at the top-right of any open schema file (`.sql`, `.prisma`, `.graphql`, etc.).
4. The interactive ERD opens in a split tab next to your code!

---

## ⚙️ Extension Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `schemagraph.theme` | `catppuccin` | Default color theme (`catppuccin`, `dark`, `light`). |
| `schemagraph.autoReloadOnSave` | `true` | Auto-refresh diagram when saving schema files. |
| `schemagraph.exportDirectory` | `./docs` | Directory for exported diagrams and schema files. |

---

## 📄 License
MIT © SKThakor
