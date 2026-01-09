# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_01_09_175341) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "action_text_rich_texts", force: :cascade do |t|
    t.string "name", null: false
    t.text "body"
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["record_type", "record_id", "name"], name: "index_action_text_rich_texts_uniqueness", unique: true
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "categories", force: :cascade do |t|
    t.string "name", null: false
    t.string "color"
    t.text "description"
    t.bigint "user_id", null: false
    t.integer "position"
    t.string "icon"
    t.boolean "archived", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "position"], name: "index_categories_on_user_id_and_position"
    t.index ["user_id"], name: "index_categories_on_user_id"
  end

  create_table "habit_completions", force: :cascade do |t|
    t.bigint "habit_id", null: false
    t.date "completed_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.integer "count", default: 1, null: false
    t.integer "streak_count", default: 0
    t.index ["habit_id", "completed_at"], name: "index_habit_completions_on_habit_id_and_completed_at", unique: true
    t.index ["habit_id"], name: "index_habit_completions_on_habit_id"
    t.index ["user_id"], name: "index_habit_completions_on_user_id"
  end

  create_table "habit_contents", force: :cascade do |t|
    t.string "content_type", null: false
    t.string "title"
    t.text "body"
    t.jsonb "metadata", default: {}
    t.integer "position", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "habit_contents_habits", id: false, force: :cascade do |t|
    t.bigint "habit_content_id", null: false
    t.bigint "habit_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["habit_content_id", "habit_id"], name: "index_habit_contents_habits_on_habit_content_id_and_habit_id"
    t.index ["habit_id", "habit_content_id"], name: "index_habit_contents_habits_on_habit_id_and_habit_content_id"
  end

  create_table "habits", force: :cascade do |t|
    t.bigint "category_id", null: false
    t.bigint "user_id", null: false
    t.string "name"
    t.text "description"
    t.boolean "positive"
    t.string "frequency_type"
    t.integer "target_count"
    t.string "time_of_day"
    t.integer "difficulty"
    t.integer "current_streak", default: 0
    t.integer "past_streaks", default: [], array: true
    t.integer "completed_count", default: 0
    t.date "start_date"
    t.datetime "last_completed_at"
    t.boolean "reminder_enabled", default: false
    t.integer "position"
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "importance", default: "normal"
    t.integer "health", default: 100, null: false
    t.date "last_missed_date"
    t.integer "consecutive_misses", default: 0, null: false
    t.integer "misses_this_week", default: 0, null: false
    t.datetime "last_health_check_at"
    t.index ["category_id"], name: "index_habits_on_category_id"
    t.index ["user_id"], name: "index_habits_on_user_id"
  end

  create_table "journals", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_journals_on_user_id"
  end

  create_table "taggings", force: :cascade do |t|
    t.string "taggable_type", null: false
    t.bigint "taggable_id", null: false
    t.bigint "tag_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["tag_id"], name: "index_taggings_on_tag_id"
    t.index ["taggable_type", "taggable_id", "tag_id"], name: "index_taggings_on_taggable_and_tag", unique: true
    t.index ["taggable_type", "taggable_id"], name: "index_taggings_on_taggable"
  end

  create_table "tags", force: :cascade do |t|
    t.string "name"
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_tags_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "timezone", default: "Pacific Time (US & Canada)"
    t.string "week_starts_on", default: "monday"
    t.string "date_format", default: "MM/DD/YYYY"
    t.string "time_format", default: "12-hour"
    t.boolean "email_reminders", default: false
    t.boolean "push_notifications", default: false
    t.string "theme", default: "light"
    t.string "default_view", default: "category"
    t.string "root_location", default: "dashboard"
    t.datetime "last_cleared_at"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "categories", "users"
  add_foreign_key "habit_completions", "habits"
  add_foreign_key "habit_completions", "users"
  add_foreign_key "habits", "categories"
  add_foreign_key "habits", "users"
  add_foreign_key "journals", "users"
  add_foreign_key "taggings", "tags"
  add_foreign_key "tags", "users"
end
