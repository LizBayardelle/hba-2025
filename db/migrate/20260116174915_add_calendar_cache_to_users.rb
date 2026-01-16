class AddCalendarCacheToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :calendar_events_cache, :jsonb
    add_column :users, :calendar_events_cached_at, :datetime
  end
end
