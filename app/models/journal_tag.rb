class JournalTag < ApplicationRecord
  belongs_to :journal
  belongs_to :tag
end
