class CreateJournalTags < ActiveRecord::Migration[7.2]
  def change
    create_table :journal_tags do |t|
      t.references :journal, null: false, foreign_key: true
      t.references :tag, null: false, foreign_key: true

      t.timestamps
    end
  end
end
