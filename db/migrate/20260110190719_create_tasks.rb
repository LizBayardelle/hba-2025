class CreateTasks < ActiveRecord::Migration[7.2]
  def change
    create_table :tasks do |t|
      t.string :name, null: false
      t.string :importance, default: 'normal'
      t.references :user, null: false, foreign_key: true
      t.references :category, null: true, foreign_key: true
      t.boolean :completed, default: false, null: false
      t.datetime :completed_at
      t.boolean :on_hold, default: false, null: false
      t.string :url
      t.string :location_name
      t.decimal :location_lat, precision: 10, scale: 6
      t.decimal :location_lng, precision: 10, scale: 6
      t.bigint :attached_document_id
      t.integer :position
      t.date :due_date
      t.time :due_time
      t.datetime :archived_at

      t.timestamps
    end

    add_index :tasks, :attached_document_id
    add_index :tasks, :completed
    add_index :tasks, :due_date
    add_index :tasks, :archived_at
  end
end
