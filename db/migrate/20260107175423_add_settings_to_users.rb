class AddSettingsToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :week_starts_on, :string, default: 'monday'
    add_column :users, :date_format, :string, default: 'MM/DD/YYYY'
    add_column :users, :time_format, :string, default: '12-hour'
    add_column :users, :email_reminders, :boolean, default: false
    add_column :users, :push_notifications, :boolean, default: false
    add_column :users, :theme, :string, default: 'light'
    add_column :users, :default_view, :string, default: 'category'
    add_column :users, :root_location, :string, default: 'dashboard'
  end
end
