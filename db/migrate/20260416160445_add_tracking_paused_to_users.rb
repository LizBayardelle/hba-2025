class AddTrackingPausedToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :tracking_paused, :boolean, default: false, null: false
  end
end
