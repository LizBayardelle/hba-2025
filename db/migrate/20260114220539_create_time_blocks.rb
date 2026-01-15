class CreateTimeBlocks < ActiveRecord::Migration[7.2]
  def change
    create_table :time_blocks do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :rank, null: false
      t.string :icon
      t.string :color

      t.timestamps
    end

    add_index :time_blocks, [:user_id, :rank], unique: true
  end
end
