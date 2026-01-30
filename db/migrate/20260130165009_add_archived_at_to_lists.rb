class AddArchivedAtToLists < ActiveRecord::Migration[7.2]
  def change
    add_column :lists, :archived_at, :datetime
  end
end
