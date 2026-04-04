class CreateProjects < ActiveRecord::Migration[7.2]
  def change
    create_table :projects do |t|
      t.string :name, null: false
      t.text :description
      t.string :color, default: '#6B8A99'
      t.string :icon, default: 'fa-briefcase'
      t.references :user, null: false, foreign_key: true
      t.integer :position
      t.boolean :archived, default: false

      t.timestamps
    end
  end
end
