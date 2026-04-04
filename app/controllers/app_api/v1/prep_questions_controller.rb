module AppApi
  module V1
    class PrepQuestionsController < BaseController
      before_action :set_prep_question, only: [:update, :destroy]

      def index
        questions = current_user.prep_questions.active.ordered
        today = if params[:date].present?
          Date.parse(params[:date])
        else
          Time.current.in_time_zone(current_user.timezone).to_date
        end
        today_responses = current_user.prep_responses.for_date(today).includes(:prep_question)

        render json: {
          questions: questions.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position]),
          responses: today_responses.map { |r|
            r.as_json(only: [:id, :prep_question_id, :response_date, :response_value])
              .merge(long_response: r.long_response.to_s)
          },
          today: today
        }
      end

      def manage
        questions = current_user.prep_questions.active.ordered

        render json: {
          questions: questions.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position])
        }
      end

      def answers
        questions = current_user.prep_questions.ordered
        responses = current_user.prep_responses.includes(:prep_question)

        responses = responses.where(prep_question_id: params[:question_id]) if params[:question_id].present?

        responses = if params[:sort] == 'oldest'
          responses.chronological
        else
          responses.reverse_chronological
        end

        render json: {
          questions: questions.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position, :archived_at]),
          responses: responses.map { |r|
            r.as_json(only: [:id, :prep_question_id, :response_date, :response_value])
              .merge(
                long_response: r.long_response.to_s,
                question_text: r.prep_question&.question_text,
                question_type: r.prep_question&.question_type,
                question_options: r.prep_question&.options
              )
          }
        }
      end

      def create
        @prep_question = current_user.prep_questions.build(prep_question_params)
        max_position = current_user.prep_questions.maximum(:position) || 0
        @prep_question.position = max_position + 1

        if @prep_question.save
          render json: {
            question: @prep_question.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position])
          }, status: :created
        else
          render_errors @prep_question.errors.full_messages
        end
      end

      def update
        if @prep_question.update(prep_question_params)
          render json: {
            question: @prep_question.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position])
          }
        else
          render_errors @prep_question.errors.full_messages
        end
      end

      def destroy
        @prep_question.archive!
        render_success({ message: 'Question archived.' })
      end

      private

      def set_prep_question
        @prep_question = current_user.prep_questions.find(params[:id])
      end

      def prep_question_params
        params.require(:prep_question).permit(:question_type, :question_text, :allow_multiple, :position, options: [])
      end
    end
  end
end
