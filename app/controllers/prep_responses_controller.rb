class PrepResponsesController < ApplicationController
  before_action :authenticate_user!

  def create
    # Find or create response for this question/date combo
    @prep_response = current_user.prep_responses.find_or_initialize_by(
      prep_question_id: prep_response_params[:prep_question_id],
      response_date: prep_response_params[:response_date]
    )

    @prep_response.response_value = prep_response_params[:response_value] if prep_response_params[:response_value].present?
    @prep_response.long_response = prep_response_params[:long_response] if prep_response_params.key?(:long_response)

    if @prep_response.save
      render json: {
        success: true,
        response: @prep_response.as_json(only: [:id, :prep_question_id, :response_date, :response_value])
          .merge(long_response: @prep_response.long_response.to_s)
      }, status: @prep_response.previously_new_record? ? :created : :ok
    else
      render json: { success: false, errors: @prep_response.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @prep_response = current_user.prep_responses.find(params[:id])

    @prep_response.response_value = prep_response_params[:response_value] if prep_response_params[:response_value].present?
    @prep_response.long_response = prep_response_params[:long_response] if prep_response_params.key?(:long_response)

    if @prep_response.save
      render json: {
        success: true,
        response: @prep_response.as_json(only: [:id, :prep_question_id, :response_date, :response_value])
          .merge(long_response: @prep_response.long_response.to_s)
      }
    else
      render json: { success: false, errors: @prep_response.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def prep_response_params
    params.require(:prep_response).permit(:prep_question_id, :response_date, :long_response, response_value: {})
  end
end
