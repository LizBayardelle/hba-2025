class AddPinnedToLists < ActiveRecord::Migration[7.2]
  def change
    add_column :lists, :pinned, :boolean, default: false, null: false
    add_index :lists, :pinned
  end
end
