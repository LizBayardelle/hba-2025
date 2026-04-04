class CreateProjectTasks < ActiveRecord::Migration[7.2]
  def change
    create_table :project_tasks do |t|
      t.string :name, null: false
      t.text :description
      t.references :section, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :parent, null: true, foreign_key: { to_table: :project_tasks }
      t.integer :position
      t.boolean :completed, default: false
      t.datetime :completed_at
      t.date :due_date
      t.boolean :archived, default: false

      t.timestamps
    end
  end
end
