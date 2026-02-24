class CreateNotes < ActiveRecord::Migration[7.2]
  def change
    create_table :notes do |t|
      t.references :user, null: false, foreign_key: true
      t.references :category, null: true, foreign_key: true
      t.string :title
      t.text :body
      t.boolean :pinned, default: false, null: false
      t.datetime :archived_at

      t.timestamps
    end
  end
end
