class AddHealthToHabits < ActiveRecord::Migration[7.2]
  def change
    add_column :habits, :health, :integer, default: 100, null: false
    add_column :habits, :last_missed_date, :date
    add_column :habits, :consecutive_misses, :integer, default: 0, null: false
    add_column :habits, :misses_this_week, :integer, default: 0, null: false
  end
end
