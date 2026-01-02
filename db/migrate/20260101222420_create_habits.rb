class CreateHabits < ActiveRecord::Migration[7.2]
  def change
    create_table :habits do |t|
      t.references :category, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :name
      t.text :description
      t.boolean :positive
      t.string :frequency_type
      t.integer :target_count
      t.string :time_of_day
      t.integer :difficulty
      t.integer :current_streak, default: 0
      t.integer :past_streaks, array: true, default: []
      t.integer :completed_count, default: 0
      t.date :start_date
      t.datetime :last_completed_at
      t.boolean :reminder_enabled, default: false
      t.integer :position
      t.datetime :archived_at

      t.timestamps
    end
  end
end
