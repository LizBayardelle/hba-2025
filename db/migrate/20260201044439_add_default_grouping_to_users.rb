class AddDefaultGroupingToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :default_habits_grouping, :string, default: 'category'
    add_column :users, :default_tasks_grouping, :string, default: 'status'
    add_column :users, :default_lists_grouping, :string, default: 'type'
    add_column :users, :default_documents_grouping, :string, default: 'type'
  end
end
