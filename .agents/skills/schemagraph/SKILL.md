---
name: schemagraph
description: Universal multi-framework database architecture, relational ERD visualizer, and schema mapper. Use when inspecting database schemas, generating ERD diagrams, mapping foreign key relationships, or exporting DBML, SQL DDL, Mermaid, SVG, or AI database prompts across any project.
---

# ⚡ SchemaGraph Skill Guide

Use this skill whenever you or the user need to:
1. **Analyze or Inspect Database Architecture**: Discover all tables, models, columns, Primary Keys (PK), Foreign Keys (FK), and relational dependencies across any backend or fullstack codebase.
2. **Generate Visual Database ERDs**: Produce interactive HTML explorers, responsive vector SVGs, or Mermaid Markdown diagrams.
3. **Export Schema Definitions**: Convert existing codebases into standardized DBML (for dbdiagram.io), SQL DDL, JSON AST, or Graphviz DOT.
4. **Generate AI Database Context**: Extract token-optimized database topology summaries for AI prompt engineering.

---

## 🎯 Supported Frameworks & File Formats

SchemaGraph auto-discovers and parses schemas across:
- **PHP / Laravel**: `database/migrations/*.php` (`Schema::create`, `Blueprint`, `foreignId()`, `constrained()`) and Eloquent models (`belongsTo`, `hasMany`).
- **Python**: Django models (`models.Model`, `ForeignKey`) and SQLAlchemy (`Base`, `Column`, `ForeignKey`).
- **Ruby on Rails**: `db/schema.rb`, migrations (`add_foreign_key`), ActiveRecord (`belongs_to`).
- **Go / GORM**: Structs with `gorm:"primaryKey"`, `gorm:"foreignKey"`, and relationship fields.
- **Java & Kotlin / Spring Boot**: JPA / Hibernate entities (`@Entity`, `@Table`, `@ManyToOne`, `@JoinColumn`).
- **Node.js & TypeScript**: Prisma (`.prisma`), Mongoose, Sequelize, TypeORM, GraphQL SDL (`.graphql`), TypeScript interfaces (`interface User`), Zod schemas (`z.object`).
- **Standard SQL DDL**: `.sql` scripts with `CREATE TABLE`, `PRIMARY KEY`, `FOREIGN KEY ... REFERENCES`.

---

## 💻 CLI Commands Quick Reference

Run `schemagraph` in the target project directory:

```bash
# 🌐 1. Interactive HTML Viewer + Vector SVG (Default)
npx schemagraph ./

# 📊 2. DBML Schema (for dbdiagram.io)
npx schemagraph ./ --format=dbml

# 🐬 3. Standard SQL DDL Schema
npx schemagraph ./ --format=sql

# 🧜‍♂️ 4. Mermaid Markdown Diagram (for README.md)
npx schemagraph ./ --format=md

# 🤖 5. Token-Optimized AI Context Prompt
npx schemagraph ./ --format=ai

# 🚀 6. Export ALL formats to a custom documentation folder
npx schemagraph ./ --format=all --output=./docs --no-open
```

---

## 📦 Node.js Programmatic API Reference

```javascript
const {
    parseProject,
    generateSVG,
    generateHTML,
    generateMarkdown,
    generateJSON,
    generateDBML,
    generateDOT,
    generateSQL,
    generateAIContext
} = require('schemagraph');

// 1. Scan and parse workspace schema models
const schemaMap = parseProject('./');

// 2. Access parsed tables and relations
// schemaMap[tableName].columns -> [{ name, type, isPrimary, isForeign, isUnique, isNullable }]
// schemaMap[tableName].relations -> [{ from, toTable, toField, cardinality }]

// 3. Generate desired outputs
const html = generateHTML(schemaMap, { title: 'Database Topology' });
const svg = generateSVG(schemaMap, { theme: 'catppuccin' });
const md = generateMarkdown(schemaMap);
const aiPrompt = generateAIContext(schemaMap);
```
