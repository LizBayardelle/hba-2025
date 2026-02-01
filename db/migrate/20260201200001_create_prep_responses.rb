class CreatePrepResponses < ActiveRecord::Migration[7.2]
  def change
    create_table :prep_responses do |t|
      t.references :user, null: false, foreign_key: true
      t.references :prep_question, null: false, foreign_key: true
      t.date :response_date, null: false
      t.jsonb :response_value, default: {}

      t.timestamps
    end

    # One answer per question per day
    add_index :prep_responses, [:prep_question_id, :response_date], unique: true
    # For "view by day" queries
    add_index :prep_responses, [:user_id, :response_date]
  end
end
