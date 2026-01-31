class Category < ApplicationRecord
  belongs_to :user
  has_many :habits, dependent: :destroy
  has_and_belongs_to_many :documents

  validates :name, presence: true
  validates :user_id, presence: true

  scope :active, -> { where(archived: false) }
  scope :ordered, -> { order(:position) }

  before_create :set_position

  private

  def set_position
    self.position ||= user.categories.maximum(:position).to_i + 1
  end
end
