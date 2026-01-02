class AddFieldsToHabitCompletions < ActiveRecord::Migration[7.2]
  def change
    add_reference :habit_completions, :user, null: false, foreign_key: true unless column_exists?(:habit_completions, :user_id)
    add_column :habit_completions, :count, :integer, default: 1, null: false unless column_exists?(:habit_completions, :count)
    add_column :habit_completions, :streak_count, :integer, default: 0 unless column_exists?(:habit_completions, :streak_count)

    change_column :habit_completions, :completed_at, :date, null: false

    add_index :habit_completions, [:habit_id, :completed_at], unique: true unless index_exists?(:habit_completions, [:habit_id, :completed_at])
  end
end
