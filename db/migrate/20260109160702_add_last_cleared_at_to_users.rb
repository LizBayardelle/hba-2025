class AddLastClearedAtToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :last_cleared_at, :datetime
  end
end
