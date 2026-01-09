class CreateTaggings < ActiveRecord::Migration[7.2]
  def change
    create_table :taggings do |t|
      t.references :taggable, polymorphic: true, null: false
      t.references :tag, null: false, foreign_key: true

      t.timestamps
    end

    add_index :taggings, [:taggable_type, :taggable_id, :tag_id], unique: true, name: 'index_taggings_on_taggable_and_tag'
  end
end
