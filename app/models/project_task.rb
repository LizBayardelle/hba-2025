class ProjectTask < ApplicationRecord
  belongs_to :project
  belongs_to :section
  belongs_to :user
  belongs_to :parent, class_name: 'ProjectTask', optional: true
  has_many :subtasks, class_name: 'ProjectTask', foreign_key: :parent_id, dependent: :destroy

  validates :name, presence: true

  scope :active, -> { where(archived: false) }
  scope :ordered, -> { order(:position) }
  scope :top_level, -> { where(parent_id: nil) }

  before_create :set_position

  private

  def set_position
    self.position ||= section.project_tasks.where(parent_id: parent_id).maximum(:position).to_i + 1
  end
end
