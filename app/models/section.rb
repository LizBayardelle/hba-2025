class Section < ApplicationRecord
  belongs_to :project
  has_many :project_tasks, dependent: :destroy

  validates :name, presence: true

  scope :active, -> { where(archived: false) }
  scope :ordered, -> { order(:position) }

  before_create :set_position

  private

  def set_position
    self.position ||= project.sections.maximum(:position).to_i + 1
  end
end
