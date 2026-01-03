class AddImportanceToHabits < ActiveRecord::Migration[7.2]
  def change
    add_column :habits, :importance, :string, default: "normal"
  end
end
