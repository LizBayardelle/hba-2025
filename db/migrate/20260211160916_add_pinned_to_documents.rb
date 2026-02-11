class AddPinnedToDocuments < ActiveRecord::Migration[7.2]
  def change
    add_column :documents, :pinned, :boolean, default: false, null: false
    add_index :documents, :pinned
  end
end
