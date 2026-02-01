class AddDashboardLayoutToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :dashboard_layout, :jsonb, default: [
      { "block" => "calendar", "column" => "left", "position" => 0, "visible" => true },
      { "block" => "quick_links", "column" => "left", "position" => 1, "visible" => true },
      { "block" => "habits", "column" => "right", "position" => 2, "visible" => true },
      { "block" => "tasks", "column" => "right", "position" => 3, "visible" => true }
    ]
  end
end
