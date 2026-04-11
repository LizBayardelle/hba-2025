class AddInactiveToPrepQuestions < ActiveRecord::Migration[7.2]
  def change
    add_column :prep_questions, :inactive, :boolean, default: false
  end
end
