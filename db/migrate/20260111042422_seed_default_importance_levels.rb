class SeedDefaultImportanceLevels < ActiveRecord::Migration[7.2]
  def up
    User.find_each do |user|
      ImportanceLevel.create!([
        { user: user, name: "Critical", rank: 1, icon: "fa-solid fa-circle-exclamation", color: "#EF4444" },
        { user: user, name: "High", rank: 2, icon: "fa-solid fa-fire", color: "#F59E0B" },
        { user: user, name: "Medium", rank: 3, icon: "fa-solid fa-star", color: "#EAB308" },
        { user: user, name: "Low", rank: 4, icon: "fa-solid fa-minus", color: "#10B981" }
      ])
    end
  end

  def down
    ImportanceLevel.delete_all
  end
end
