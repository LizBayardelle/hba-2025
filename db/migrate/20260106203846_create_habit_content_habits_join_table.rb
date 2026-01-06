class CreateHabitContentHabitsJoinTable < ActiveRecord::Migration[7.2]
  def change
    create_join_table :habit_contents, :habits do |t|
      t.index [:habit_content_id, :habit_id]
      t.index [:habit_id, :habit_content_id]
      t.timestamps
    end

    # Migrate existing data
    reversible do |dir|
      dir.up do
        # Copy existing associations to join table
        execute <<-SQL
          INSERT INTO habit_contents_habits (habit_content_id, habit_id, created_at, updated_at)
          SELECT id, habit_id, created_at, updated_at
          FROM habit_contents
          WHERE habit_id IS NOT NULL
        SQL
      end
    end

    # Remove the old foreign key column
    remove_column :habit_contents, :habit_id, :bigint
  end
end
