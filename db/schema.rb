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

ActiveRecord::Schema[7.2].define(version: 2026_01_04_000010) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

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

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "categories", "users"
  add_foreign_key "habit_completions", "habits"
  add_foreign_key "habit_completions", "users"
  add_foreign_key "habits", "categories"
  add_foreign_key "habits", "users"
end
