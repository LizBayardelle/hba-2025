class CreatePrepQuestions < ActiveRecord::Migration[7.2]
  def change
    create_table :prep_questions do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :question_type, null: false, default: 0
      t.string :question_text, null: false
      t.jsonb :options, default: []
      t.boolean :allow_multiple, default: false
      t.integer :position, default: 0
      t.datetime :archived_at

      t.timestamps
    end

    add_index :prep_questions, [:user_id, :position]
    add_index :prep_questions, [:user_id, :archived_at]
  end
end
