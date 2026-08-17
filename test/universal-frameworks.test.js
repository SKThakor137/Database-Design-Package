const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const LaravelParser = require('../src/parser/laravel-parser');
const PythonParser = require('../src/parser/python-parser');
const RailsParser = require('../src/parser/rails-parser');
const GoParser = require('../src/parser/go-parser');
const JPAParser = require('../src/parser/jpa-parser');
const UniversalSchemaParser = require('../src/parser/universal-parser');

test('LaravelParser parses Schema::create migrations with foreignId constraints', () => {
    const phpContent = `
    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name', 100);
        $table->string('email')->unique();
        $table->timestamps();
    });

    Schema::create('orders', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
        $table->decimal('total', 10, 2);
        $table->timestamps();
    });
    `;

    const models = LaravelParser.parse(phpContent);

    assert.ok(models.users, 'Users table should exist');
    assert.ok(models.orders, 'Orders table should exist');

    assert.strictEqual(models.users.columns.find(c => c.name === 'id').isPrimary, true);
    assert.strictEqual(models.users.columns.find(c => c.name === 'email').isUnique, true);

    const userRel = models.orders.relations.find(r => r.fromColumn === 'user_id');
    assert.ok(userRel, 'Relation user_id -> users should exist');
    assert.strictEqual(userRel.toTable, 'users');
    assert.strictEqual(userRel.toColumn, 'id');
});

test('PythonParser parses Django models and relationships', () => {
    const pythonContent = `
from django.db import models

class Author(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)

class Book(models.Model):
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    `;

    const models = PythonParser.parse(pythonContent);

    assert.ok(models.authors, 'Authors table should exist');
    assert.ok(models.books, 'Books table should exist');

    const authorRel = models.books.relations.find(r => r.fromColumn === 'author_id');
    assert.ok(authorRel, 'Relation author_id -> authors should exist');
    assert.strictEqual(authorRel.toTable, 'authors');
});

test('PythonParser parses SQLAlchemy Base models and foreign keys', () => {
    const sqlaContent = `
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True)

class Post(Base):
    __tablename__ = 'posts'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    title = Column(String(200))
    `;

    const models = PythonParser.parse(sqlaContent);

    assert.ok(models.users, 'Users table should exist');
    assert.ok(models.posts, 'Posts table should exist');

    const fkRel = models.posts.relations.find(r => r.fromColumn === 'user_id');
    assert.ok(fkRel, 'Relation user_id -> users should exist');
    assert.strictEqual(fkRel.toTable, 'users');
});

test('RailsParser parses create_table and add_foreign_key', () => {
    const rubyContent = `
create_table "accounts", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", precision: 6, null: false
end

create_table "users", force: :cascade do |t|
    t.references :account, null: false, foreign_key: true
    t.string "email", null: false
end

add_foreign_key "users", "accounts"
    `;

    const models = RailsParser.parse(rubyContent);

    assert.ok(models.accounts, 'Accounts table should exist');
    assert.ok(models.users, 'Users table should exist');

    const accountRel = models.users.relations.find(r => r.fromColumn === 'account_id');
    assert.ok(accountRel, 'Relation account_id -> accounts should exist');
});

test('GoParser parses GORM structs and foreignKey tags', () => {
    const goContent = `
package models

type Company struct {
    ID   uint   \`gorm:"primaryKey"\`
    Name string \`gorm:"size:100;not null"\`
}

type Employee struct {
    ID        uint    \`gorm:"primaryKey"\`
    CompanyID uint    \`gorm:"not null"\`
    Company   Company \`gorm:"foreignKey:CompanyID"\`
    Name      string  \`gorm:"size:100"\`
}
    `;

    const models = GoParser.parse(goContent);

    assert.ok(models.companies, 'Companies table should exist');
    assert.ok(models.employees, 'Employees table should exist');

    const companyRel = models.employees.relations.find(r => r.fromColumn === 'company_id');
    assert.ok(companyRel, 'Relation company_id -> companies should exist');
    assert.strictEqual(companyRel.toTable, 'companies');
});

test('JPAParser parses Java Spring Boot JPA entities and @ManyToOne', () => {
    const javaContent = `
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;
}

@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "amount")
    private BigDecimal amount;
}
    `;

    const models = JPAParser.parse(javaContent);

    assert.ok(models.customers, 'Customers table should exist');
    assert.ok(models.invoices, 'Invoices table should exist');

    const customerRel = models.invoices.relations.find(r => r.fromColumn === 'customer_id');
    assert.ok(customerRel, 'Relation customer_id -> customers should exist');
    assert.strictEqual(customerRel.toTable, 'customers');
});

test('UniversalSchemaParser scans examples directory and auto-discovers all frameworks', () => {
    const examplesPath = path.resolve(__dirname, '../examples');
    const parser = new UniversalSchemaParser();
    const models = parser.scanDirectory(examplesPath);

    const modelKeys = Object.keys(models);
    assert.ok(modelKeys.length >= 6, `Should have discovered at least 6 models across frameworks, got ${modelKeys.length}`);
});

test('CLI parseArgs enables auto-open by default and handles --no-open flag', () => {
    const { parseArgs } = require('../src/cli');
    const defaultOpts = parseArgs([]);
    assert.strictEqual(defaultOpts.open, true, 'open should be true by default');

    const noOpenOpts = parseArgs(['--no-open']);
    assert.strictEqual(noOpenOpts.open, false, 'open should be false when --no-open passed');

    const openOpts = parseArgs(['--open']);
    assert.strictEqual(openOpts.open, true, 'open should be true when --open passed');
});

