class DropLegacyPromptColumns < ActiveRecord::Migration[7.2]
  def change
    remove_column :prompts, :question_type, :integer, default: 0, null: false
    remove_column :prompts, :options, :jsonb, default: []

    remove_column :prompt_responses, :response_value, :jsonb, default: {}
  end
end
