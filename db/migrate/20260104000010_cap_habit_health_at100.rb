class CapHabitHealthAt100 < ActiveRecord::Migration[7.2]
  def up
    # Cap any habits with health > 100 to 100
    Habit.where('health > 100').update_all(health: 100)
  end

  def down
    # No need to revert this - we want health capped at 100
  end
end
