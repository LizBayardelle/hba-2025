class CreateImportanceLevels < ActiveRecord::Migration[7.2]
  def change
    create_table :importance_levels do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :rank, null: false
      t.string :icon
      t.string :color

      t.timestamps
    end

    add_index :importance_levels, [:user_id, :rank], unique: true
  end
end
