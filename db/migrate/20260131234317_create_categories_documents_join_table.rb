class CreateCategoriesDocumentsJoinTable < ActiveRecord::Migration[7.2]
  def change
    create_join_table :categories, :documents do |t|
      t.index [:category_id, :document_id], unique: true
      t.index [:document_id, :category_id]
    end
  end
end
