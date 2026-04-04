class Project < ApplicationRecord
  belongs_to :user
  has_many :sections, dependent: :destroy
  has_many :project_tasks, dependent: :destroy

  validates :name, presence: true
  validates :user_id, presence: true

  scope :active, -> { where(archived: false) }
  scope :ordered, -> { order(:position) }

  before_create :set_position

  private

  def set_position
    self.position ||= user.projects.maximum(:position).to_i + 1
  end
end
