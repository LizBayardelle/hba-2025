class AddFieldsToHabitCompletions < ActiveRecord::Migration[7.2]
  def change
    add_reference :habit_completions, :user, null: false, foreign_key: true
    add_column :habit_completions, :count, :integer, default: 1, null: false
    add_column :habit_completions, :streak_count, :integer, default: 0

    change_column :habit_completions, :completed_at, :date, null: false

    add_index :habit_completions, [:habit_id, :completed_at], unique: true
  end
end
