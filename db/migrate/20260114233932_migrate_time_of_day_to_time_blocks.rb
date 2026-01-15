class MigrateTimeOfDayToTimeBlocks < ActiveRecord::Migration[7.2]
  def up
    # For each user, migrate their habits' time_of_day to time_blocks
    User.find_each do |user|
      # Get the user's time blocks
      morning_block = user.time_blocks.find_by(name: 'Morning')
      afternoon_block = user.time_blocks.find_by(name: 'Afternoon')
      evening_block = user.time_blocks.find_by(name: 'Evening')

      # Update habits based on their time_of_day value
      user.habits.find_each do |habit|
        case habit.time_of_day
        when 'am', 'morning'
          habit.update_column(:time_block_id, morning_block&.id) if morning_block
        when 'pm', 'afternoon'
          habit.update_column(:time_block_id, afternoon_block&.id) if afternoon_block
        when 'night', 'evening'
          habit.update_column(:time_block_id, evening_block&.id) if evening_block
        # 'anytime' or nil stays as nil (no time block)
        end
      end
    end
  end

  def down
    # Reverse migration: set time_block_id back to nil
    # (We can't restore the exact time_of_day values, but we can clear time_blocks)
    Habit.update_all(time_block_id: nil)
  end
end
