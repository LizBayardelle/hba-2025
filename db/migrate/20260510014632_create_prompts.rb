class CreatePrompts < ActiveRecord::Migration[7.2]
  def change
    create_table :prompts do |t|
      t.references :user, null: false, foreign_key: true
      t.references :category, foreign_key: true
      t.string :title, null: false
      t.text :description
      t.integer :position, default: 0
      t.datetime :archived_at

      t.timestamps
    end
    add_index :prompts, [:user_id, :archived_at]
    add_index :prompts, [:user_id, :position]

    create_table :prompt_responses do |t|
      t.references :user, null: false, foreign_key: true
      t.references :prompt, null: false, foreign_key: true

      t.timestamps
    end
    add_index :prompt_responses, [:prompt_id, :created_at]
  end
end
