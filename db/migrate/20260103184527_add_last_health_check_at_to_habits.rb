class AddLastHealthCheckAtToHabits < ActiveRecord::Migration[7.2]
  def change
    add_column :habits, :last_health_check_at, :datetime
  end
end
