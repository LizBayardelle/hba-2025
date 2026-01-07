class HomeController < ApplicationController
  def index
    if user_signed_in?
      case current_user.root_location
      when 'habits'
        redirect_to habits_path
      when 'analytics'
        redirect_to analytics_path
      else
        redirect_to dashboard_path
      end
    else
      redirect_to new_user_session_path
    end
  end
end
