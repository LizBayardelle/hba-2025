class CreateGoals < ActiveRecord::Migration[7.2]
  def change
    create_table :goals do |t|
      t.string :name, null: false
      t.text :description
      t.string :goal_type, null: false, default: 'counted' # 'named_steps' or 'counted'
      t.integer :target_count, default: 1
      t.integer :current_count, default: 0
      t.string :unit_name
      t.references :user, null: false, foreign_key: true
      t.references :category, null: true, foreign_key: true
      t.references :importance_level, null: true, foreign_key: true
      t.references :time_block, null: true, foreign_key: true
      t.boolean :completed, default: false, null: false
      t.datetime :completed_at
      t.datetime :archived_at
      t.integer :position
      t.timestamps
    end

    add_index :goals, :archived_at
    add_index :goals, :completed
    add_index :goals, :goal_type

    create_table :documents_goals, id: false do |t|
      t.bigint :document_id, null: false
      t.bigint :goal_id, null: false
    end

    add_index :documents_goals, [:document_id, :goal_id], unique: true
    add_index :documents_goals, [:goal_id, :document_id]
  end
end
