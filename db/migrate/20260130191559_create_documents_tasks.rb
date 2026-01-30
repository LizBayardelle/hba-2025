class CreateDocumentsTasks < ActiveRecord::Migration[7.2]
  def change
    create_table :documents_tasks, id: false do |t|
      t.belongs_to :document, null: false, foreign_key: true
      t.belongs_to :task, null: false, foreign_key: true
    end

    add_index :documents_tasks, [:document_id, :task_id], unique: true
  end
end
