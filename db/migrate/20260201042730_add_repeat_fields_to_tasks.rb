class AddRepeatFieldsToTasks < ActiveRecord::Migration[7.2]
  def change
    # Frequency: 'daily', 'weekly', 'monthly', 'yearly' (null = no repeat)
    add_column :tasks, :repeat_frequency, :string
    # Interval: every X days/weeks/months/years (default 1)
    add_column :tasks, :repeat_interval, :integer, default: 1
    # Days config: for weekly = [0,1,2,3,4,5,6] (Sun-Sat), for monthly = [1,15] (days of month)
    add_column :tasks, :repeat_days, :jsonb, default: []
    # Optional end date for the repetition
    add_column :tasks, :repeat_end_date, :date

    add_index :tasks, :repeat_frequency
  end
end
