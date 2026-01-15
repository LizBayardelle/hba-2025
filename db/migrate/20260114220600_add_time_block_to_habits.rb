class AddTimeBlockToHabits < ActiveRecord::Migration[7.2]
  def change
    add_reference :habits, :time_block, null: true, foreign_key: true
  end
end
