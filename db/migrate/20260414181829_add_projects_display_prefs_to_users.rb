class AddProjectsDisplayPrefsToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :projects_view, :string, default: "cards", null: false
    add_column :users, :projects_expand_all, :boolean, default: false, null: false
  end
end
