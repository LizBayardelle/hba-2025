class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  before_action :set_cache_headers
  before_action :update_habit_health, if: :user_signed_in?

  private

  def set_cache_headers
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
  end

  def update_habit_health
    # Only check habits that haven't been checked today
    # This is efficient because it only queries habits needing updates
    current_user.habits.active.where("last_health_check_at < ? OR last_health_check_at IS NULL", Date.today.beginning_of_day).find_each do |habit|
      habit.calculate_streak!
      habit.update_health!
    end
  end
end
