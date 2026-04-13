class AddAnalyticsDisplayToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :analytics_display, :string, default: "both", null: false
  end
end
