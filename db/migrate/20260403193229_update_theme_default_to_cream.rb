class UpdateThemeDefaultToCream < ActiveRecord::Migration[7.2]
  def up
    change_column_default :users, :theme, "cream"
    User.where(theme: [nil, "light"]).update_all(theme: "cream")
  end

  def down
    change_column_default :users, :theme, "light"
  end
end
