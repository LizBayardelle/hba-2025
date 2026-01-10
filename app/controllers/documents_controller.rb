class DocumentsController < ApplicationController
  before_action :authenticate_user!

  def index
    # Get all documents: either unattached or attached to user's habits
    @habit_contents = Document.left_joins(:habits)
                               .where('habits.id IS NULL OR habits.user_id = ?', current_user.id)
                               .distinct
                               .includes(habits: :category)
                               .order(created_at: :desc)

    # Group by content type for easier display
    @grouped_contents = @habit_contents.group_by(&:content_type)
  end
end
