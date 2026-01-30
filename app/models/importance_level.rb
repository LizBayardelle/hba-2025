class ImportanceLevel < ApplicationRecord
  belongs_to :user
  has_many :tasks, dependent: :nullify
  has_many :habits, dependent: :nullify

  validates :name, presence: true
  validates :rank, presence: true, uniqueness: { scope: :user_id }
  validates :user_id, presence: true

  scope :ordered, -> { order(:rank) }

  # Check if this is the protected "Optional" level
  def optional?
    name == "Optional" || name_was == "Optional"
  end

  # Prevent deletion of Optional level
  before_destroy :prevent_optional_deletion

  # Prevent renaming of Optional level
  before_update :prevent_optional_rename

  private

  def prevent_optional_deletion
    if name == "Optional"
      errors.add(:base, "Cannot delete the Optional importance level")
      throw :abort
    end
  end

  def prevent_optional_rename
    if name_was == "Optional" && name != "Optional"
      errors.add(:name, "Cannot rename the Optional importance level")
      throw :abort
    end
  end
end
