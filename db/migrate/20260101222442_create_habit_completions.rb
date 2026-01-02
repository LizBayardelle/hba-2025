class CreateHabitCompletions < ActiveRecord::Migration[7.2]
  def change
    create_table :habit_completions do |t|
      t.references :habit, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.date :completed_at, null: false
      t.integer :count, default: 1, null: false
      t.integer :streak_count, default: 0

      t.timestamps
    end

    add_index :habit_completions, [:habit_id, :completed_at], unique: true
  end
end
