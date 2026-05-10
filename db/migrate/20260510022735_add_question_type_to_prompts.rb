class AddQuestionTypeToPrompts < ActiveRecord::Migration[7.2]
  def change
    add_column :prompts, :question_type, :integer, default: 0, null: false
    add_column :prompts, :options, :jsonb, default: []

    add_column :prompt_responses, :response_value, :jsonb, default: {}
  end
end
