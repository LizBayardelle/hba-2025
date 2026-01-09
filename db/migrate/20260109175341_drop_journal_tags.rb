class DropJournalTags < ActiveRecord::Migration[7.2]
  def change
    drop_table :journal_tags, if_exists: true
  end
end
