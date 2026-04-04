class CreateSections < ActiveRecord::Migration[7.2]
  def change
    create_table :sections do |t|
      t.string :name, null: false
      t.references :project, null: false, foreign_key: true
      t.integer :position
      t.boolean :archived, default: false

      t.timestamps
    end
  end
end
