class CreateCategories < ActiveRecord::Migration[7.2]
  def change
    create_table :categories do |t|
      t.string :name, null: false
      t.string :color
      t.text :description
      t.references :user, null: false, foreign_key: true
      t.integer :position
      t.string :icon
      t.boolean :archived, default: false, null: false

      t.timestamps
    end

    add_index :categories, [:user_id, :position]
  end
end
