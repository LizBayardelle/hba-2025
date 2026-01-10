class RenameHabitContentsToDocuments < ActiveRecord::Migration[7.2]
  def change
    rename_table :habit_contents, :documents
  end
end
