class CreateLists < ActiveRecord::Migration[7.2]
  def change
    # Create the lists table
    create_table :lists do |t|
      t.string :name, null: false
      t.references :user, null: false, foreign_key: true
      t.references :category, foreign_key: true

      t.timestamps
    end

    # Recreate list_attachments with proper structure (non-polymorphic list)
    create_table :list_attachments do |t|
      t.references :attachable, polymorphic: true, null: false
      t.references :list, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end

    # Prevent duplicate attachments
    add_index :list_attachments, [:attachable_type, :attachable_id, :list_id],
              unique: true, name: 'index_list_attachments_uniqueness'
  end
end
