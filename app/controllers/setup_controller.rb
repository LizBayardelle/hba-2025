class SetupController < ApplicationController
  before_action :authenticate_user!

  def show
  end

  def complete
    current_user.update(setup_completed_at: Time.current)
    render json: { success: true, redirect_to: root_path }
  end
end
