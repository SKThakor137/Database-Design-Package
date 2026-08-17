ActiveRecord::Schema.define(version: 2026_01_01_000000) do

  enable_extension "plpgsql"

  create_table "users", force: :cascade do |t|
    t.string "name", limit: 100, null: false
    t.string "email", null: false
    t.string "role", default: "customer"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  create_table "posts", force: :cascade do |t|
    t.references :user, null: false, foreign_key: true
    t.string "title", limit: 255, null: false
    t.text "body"
    t.boolean "published", default: false
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
  end

  create_table "comments", force: :cascade do |t|
    t.references :user, null: false, foreign_key: true
    t.references :post, null: false, foreign_key: true
    t.text "content", null: false
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
  end

  add_foreign_key "posts", "users"
  add_foreign_key "comments", "users"
  add_foreign_key "comments", "posts"
end
