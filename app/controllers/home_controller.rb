class HomeController < ApplicationController
  def index
    # Show public landing page for non-logged-in users
    unless user_signed_in?
      render :landing
      return
    end

    # Redirect logged-in users based on their preference
    case current_user.root_location
    when 'habits'
      redirect_to habits_path
    when 'analytics'
      redirect_to analytics_path
    else
      redirect_to dashboard_path
    end
  end
end
