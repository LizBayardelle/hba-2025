module AppApi
  module V1
    class PromptResponsesController < BaseController
      before_action :set_response, only: [:update, :destroy]

      def create
        prompt = current_user.prompts.find(params[:prompt_id])
        @response = prompt.prompt_responses.build(user: current_user)

        prompt.prompt_questions.ordered.each do |question|
          answer = @response.prompt_answers.build(prompt_question: question)
          apply_value(answer, raw_answer_for(question))
        end

        if @response.save
          render json: { response: response_json(@response) }, status: :created
        else
          render_errors @response.errors.full_messages
        end
      end

      def update
        @response.prompt.prompt_questions.ordered.each do |question|
          answer = @response.prompt_answers.find { |a| a.prompt_question_id == question.id } ||
                   @response.prompt_answers.build(prompt_question: question)
          apply_value(answer, raw_answer_for(question))
        end

        if @response.save
          render json: { response: response_json(@response) }
        else
          render_errors @response.errors.full_messages
        end
      end

      def destroy
        @response.destroy
        render_success message: 'Response deleted.'
      end

      private

      def set_response
        @response = current_user.prompt_responses
                                .includes(prompt_answers: [:prompt_question, :rich_text_body])
                                .find(params[:id])
      end

      # answers shape: { "<question_id>" => { text_value:, number_value:, yes_value:, selected_value:, body: } }
      def raw_answer_for(question)
        answers = params.dig(:prompt_response, :answers) || {}
        answers[question.id.to_s] || {}
      end

      def apply_value(answer, raw)
        case answer.question_type
        when "short_answer"
          answer.text_value = raw[:text_value]
        when "long_answer"
          answer.body = raw[:body]
        when "integer"
          answer.number_value = raw[:number_value]
        when "yes_no"
          answer.yes_value = raw[:yes_value] unless raw[:yes_value].nil? || raw[:yes_value] == ""
        when "multiple_choice"
          answer.selected_value = raw[:selected_value]
        when "checkboxes"
          answer.selected_value = Array(raw[:selected_value]).reject(&:blank?)
        end
      end

      def response_json(response)
        response.as_json(only: [:id, :prompt_id, :created_at, :updated_at])
                .merge(answers: response.prompt_answers.map { |a|
                  {
                    prompt_question_id: a.prompt_question_id,
                    question_type: a.question_type,
                    response_value: a.response_value,
                    body: a.body.to_s,
                    display_value: a.display_value
                  }
                })
      end
    end
  end
end
