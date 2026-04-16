class AddSetupCompletedAtToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :setup_completed_at, :datetime

    reversible do |dir|
      dir.up do
        execute "UPDATE users SET setup_completed_at = created_at WHERE setup_completed_at IS NULL"
      end
    end
  end
end
