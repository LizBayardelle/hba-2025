class AddScheduleFieldsToHabits < ActiveRecord::Migration[7.2]
  def change
    add_column :habits, :schedule_mode, :string, default: 'flexible', null: false
    add_column :habits, :schedule_config, :jsonb, default: {}, null: false
    add_index :habits, :schedule_mode
    add_index :habits, :schedule_config, using: :gin
  end
end
