class CreateChecklistItems < ActiveRecord::Migration[7.2]
  def change
    create_table :checklist_items do |t|
      t.string :checklistable_type, null: false
      t.bigint :checklistable_id, null: false
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.boolean :completed, default: false, null: false
      t.datetime :completed_at
      t.integer :position, default: 0, null: false

      t.timestamps
    end

    add_index :checklist_items, [:checklistable_type, :checklistable_id], name: 'index_checklist_items_on_checklistable'
  end
end
