class AddTimezoneToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :timezone, :string, default: 'Pacific Time (US & Canada)'
  end
end
