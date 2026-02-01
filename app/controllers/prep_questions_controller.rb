class PrepQuestionsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_prep_question, only: [:update, :destroy]

  def index
    @prep_questions = current_user.prep_questions.active.ordered
    @today = Time.current.in_time_zone(current_user.timezone).to_date
    @today_responses = current_user.prep_responses.for_date(@today).includes(:prep_question)

    respond_to do |format|
      format.html
      format.json {
        render json: {
          questions: @prep_questions.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position]),
          responses: @today_responses.map { |r|
            r.as_json(only: [:id, :prep_question_id, :response_date, :response_value])
              .merge(long_response: r.long_response.to_s)
          },
          today: @today
        }
      }
    end
  end

  def manage
    @prep_questions = current_user.prep_questions.active.ordered

    respond_to do |format|
      format.html
      format.json {
        render json: {
          questions: @prep_questions.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position])
        }
      }
    end
  end

  def answers
    # Get all questions (including archived, for historical context)
    @prep_questions = current_user.prep_questions.ordered

    # Get all responses, optionally filtered by question
    @responses = current_user.prep_responses.includes(:prep_question)

    if params[:question_id].present?
      @responses = @responses.where(prep_question_id: params[:question_id])
    end

    # Sort by date
    @responses = if params[:sort] == 'oldest'
      @responses.chronological
    else
      @responses.reverse_chronological
    end

    respond_to do |format|
      format.html
      format.json {
        render json: {
          questions: @prep_questions.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position, :archived_at]),
          responses: @responses.map { |r|
            r.as_json(only: [:id, :prep_question_id, :response_date, :response_value])
              .merge(
                long_response: r.long_response.to_s,
                question_text: r.prep_question&.question_text,
                question_type: r.prep_question&.question_type,
                question_options: r.prep_question&.options
              )
          }
        }
      }
    end
  end

  def create
    @prep_question = current_user.prep_questions.build(prep_question_params)

    # Set position to end
    max_position = current_user.prep_questions.maximum(:position) || 0
    @prep_question.position = max_position + 1

    if @prep_question.save
      render json: {
        success: true,
        question: @prep_question.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position])
      }, status: :created
    else
      render json: { success: false, errors: @prep_question.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @prep_question.update(prep_question_params)
      render json: {
        success: true,
        question: @prep_question.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position])
      }
    else
      render json: { success: false, errors: @prep_question.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @prep_question.archive!
    render json: { success: true }
  end

  private

  def set_prep_question
    @prep_question = current_user.prep_questions.find(params[:id])
  end

  def prep_question_params
    params.require(:prep_question).permit(:question_type, :question_text, :allow_multiple, :position, options: [])
  end
end
