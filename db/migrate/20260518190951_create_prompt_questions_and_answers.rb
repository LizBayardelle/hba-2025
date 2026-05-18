class CreatePromptQuestionsAndAnswers < ActiveRecord::Migration[7.2]
  def change
    create_table :prompt_questions do |t|
      t.references :prompt, null: false, foreign_key: true
      t.string :text, null: false
      t.integer :question_type, default: 0, null: false
      t.jsonb :options, default: []
      t.integer :position, default: 0

      t.timestamps
    end
    add_index :prompt_questions, [:prompt_id, :position]

    create_table :prompt_answers do |t|
      t.references :prompt_response, null: false, foreign_key: true
      t.references :prompt_question, null: false, foreign_key: true
      t.jsonb :response_value, default: {}

      t.timestamps
    end
    add_index :prompt_answers, [:prompt_response_id, :prompt_question_id], unique: true, name: "idx_prompt_answers_on_response_question"
  end
end
