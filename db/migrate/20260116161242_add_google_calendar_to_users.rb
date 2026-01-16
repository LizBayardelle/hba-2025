class AddGoogleCalendarToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :google_refresh_token, :text
    add_column :users, :google_calendar_id, :string
    add_column :users, :google_sync_enabled, :boolean, default: false
  end
end
