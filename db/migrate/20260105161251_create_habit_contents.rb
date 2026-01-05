class CreateHabitContents < ActiveRecord::Migration[7.2]
  def change
    create_table :habit_contents do |t|
      t.references :habit, null: false, foreign_key: true
      t.string :content_type, null: false
      t.string :title
      t.text :body
      t.jsonb :metadata, default: {}
      t.integer :position, default: 0

      t.timestamps
    end

    add_index :habit_contents, [:habit_id, :position]
  end
end
