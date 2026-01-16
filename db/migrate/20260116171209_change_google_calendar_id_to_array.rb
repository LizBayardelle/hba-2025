class ChangeGoogleCalendarIdToArray < ActiveRecord::Migration[7.2]
  def up
    # Change the column type to an array of strings
    change_column :users, :google_calendar_id, :string, array: true, default: [], using: 'ARRAY[google_calendar_id]::VARCHAR[]'
  end

  def down
    # Revert to single string (takes first element)
    change_column :users, :google_calendar_id, :string, using: 'google_calendar_id[1]'
  end
end
