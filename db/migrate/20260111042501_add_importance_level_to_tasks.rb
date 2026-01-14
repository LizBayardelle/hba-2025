class AddImportanceLevelToTasks < ActiveRecord::Migration[7.2]
  def change
    add_reference :tasks, :importance_level, null: true, foreign_key: true
  end
end
