class RenameHabitContentsHabitsToDocumentsHabits < ActiveRecord::Migration[7.2]
  def change
    rename_table :habit_contents_habits, :documents_habits
    rename_column :documents_habits, :habit_content_id, :document_id
  end
end
