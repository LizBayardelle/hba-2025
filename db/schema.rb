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

ActiveRecord::Schema[7.2].define(version: 2026_01_30_191559) do
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

  create_table "checklist_items", force: :cascade do |t|
    t.string "checklistable_type", null: false
    t.bigint "checklistable_id", null: false
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.boolean "completed", default: false, null: false
    t.datetime "completed_at"
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["checklistable_type", "checklistable_id"], name: "index_checklist_items_on_checklistable"
    t.index ["user_id"], name: "index_checklist_items_on_user_id"
  end

  create_table "documents", force: :cascade do |t|
    t.string "content_type", null: false
    t.string "title"
    t.text "body"
    t.jsonb "metadata", default: {}
    t.integer "position", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "documents_habits", id: false, force: :cascade do |t|
    t.bigint "document_id", null: false
    t.bigint "habit_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["document_id", "habit_id"], name: "index_documents_habits_on_document_id_and_habit_id"
    t.index ["habit_id", "document_id"], name: "index_documents_habits_on_habit_id_and_document_id"
  end

  create_table "documents_tasks", id: false, force: :cascade do |t|
    t.bigint "document_id", null: false
    t.bigint "task_id", null: false
    t.index ["document_id", "task_id"], name: "index_documents_tasks_on_document_id_and_task_id", unique: true
    t.index ["document_id"], name: "index_documents_tasks_on_document_id"
    t.index ["task_id"], name: "index_documents_tasks_on_task_id"
  end

  create_table "habit_completions", force: :cascade do |t|
    t.bigint "habit_id", null: false
    t.bigint "user_id", null: false
    t.date "completed_at", null: false
    t.integer "count", default: 1, null: false
    t.integer "streak_count", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["habit_id", "completed_at"], name: "index_habit_completions_on_habit_id_and_completed_at", unique: true
    t.index ["habit_id"], name: "index_habit_completions_on_habit_id"
    t.index ["user_id"], name: "index_habit_completions_on_user_id"
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
    t.bigint "importance_level_id"
    t.bigint "time_block_id"
    t.string "schedule_mode", default: "flexible", null: false
    t.jsonb "schedule_config", default: {}, null: false
    t.index ["category_id"], name: "index_habits_on_category_id"
    t.index ["importance_level_id"], name: "index_habits_on_importance_level_id"
    t.index ["schedule_config"], name: "index_habits_on_schedule_config", using: :gin
    t.index ["schedule_mode"], name: "index_habits_on_schedule_mode"
    t.index ["time_block_id"], name: "index_habits_on_time_block_id"
    t.index ["user_id"], name: "index_habits_on_user_id"
  end

  create_table "importance_levels", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.integer "rank", null: false
    t.string "icon"
    t.string "color"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "rank"], name: "index_importance_levels_on_user_id_and_rank", unique: true
    t.index ["user_id"], name: "index_importance_levels_on_user_id"
  end

  create_table "journals", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_journals_on_user_id"
  end

  create_table "list_attachments", force: :cascade do |t|
    t.string "attachable_type", null: false
    t.bigint "attachable_id", null: false
    t.bigint "list_id", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["attachable_type", "attachable_id", "list_id"], name: "index_list_attachments_uniqueness", unique: true
    t.index ["attachable_type", "attachable_id"], name: "index_list_attachments_on_attachable"
    t.index ["list_id"], name: "index_list_attachments_on_list_id"
    t.index ["user_id"], name: "index_list_attachments_on_user_id"
  end

  create_table "lists", force: :cascade do |t|
    t.string "name", null: false
    t.bigint "user_id", null: false
    t.bigint "category_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "archived_at"
    t.index ["category_id"], name: "index_lists_on_category_id"
    t.index ["user_id"], name: "index_lists_on_user_id"
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

  create_table "tasks", force: :cascade do |t|
    t.string "name", null: false
    t.string "importance", default: "normal"
    t.bigint "user_id", null: false
    t.bigint "category_id"
    t.boolean "completed", default: false, null: false
    t.datetime "completed_at"
    t.boolean "on_hold", default: false, null: false
    t.string "url"
    t.string "location_name"
    t.decimal "location_lat", precision: 10, scale: 6
    t.decimal "location_lng", precision: 10, scale: 6
    t.bigint "attached_document_id"
    t.integer "position"
    t.date "due_date"
    t.time "due_time"
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "importance_level_id"
    t.integer "time_block_id"
    t.index ["archived_at"], name: "index_tasks_on_archived_at"
    t.index ["attached_document_id"], name: "index_tasks_on_attached_document_id"
    t.index ["category_id"], name: "index_tasks_on_category_id"
    t.index ["completed"], name: "index_tasks_on_completed"
    t.index ["due_date"], name: "index_tasks_on_due_date"
    t.index ["importance_level_id"], name: "index_tasks_on_importance_level_id"
    t.index ["user_id"], name: "index_tasks_on_user_id"
  end

  create_table "time_blocks", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.integer "rank", null: false
    t.string "icon"
    t.string "color"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "rank"], name: "index_time_blocks_on_user_id_and_rank", unique: true
    t.index ["user_id"], name: "index_time_blocks_on_user_id"
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
    t.text "google_refresh_token"
    t.string "google_calendar_id", default: [], array: true
    t.boolean "google_sync_enabled", default: false
    t.jsonb "calendar_events_cache"
    t.datetime "calendar_events_cached_at"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "categories", "users"
  add_foreign_key "checklist_items", "users"
  add_foreign_key "documents_tasks", "documents"
  add_foreign_key "documents_tasks", "tasks"
  add_foreign_key "habit_completions", "habits"
  add_foreign_key "habit_completions", "users"
  add_foreign_key "habits", "categories"
  add_foreign_key "habits", "importance_levels"
  add_foreign_key "habits", "time_blocks"
  add_foreign_key "habits", "users"
  add_foreign_key "importance_levels", "users"
  add_foreign_key "journals", "users"
  add_foreign_key "list_attachments", "lists"
  add_foreign_key "list_attachments", "users"
  add_foreign_key "lists", "categories"
  add_foreign_key "lists", "users"
  add_foreign_key "taggings", "tags"
  add_foreign_key "tags", "users"
  add_foreign_key "tasks", "categories"
  add_foreign_key "tasks", "importance_levels"
  add_foreign_key "tasks", "users"
  add_foreign_key "time_blocks", "users"
end
