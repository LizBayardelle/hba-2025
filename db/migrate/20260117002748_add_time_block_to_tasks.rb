class AddTimeBlockToTasks < ActiveRecord::Migration[7.2]
  def change
    add_column :tasks, :time_block_id, :integer
  end
end
