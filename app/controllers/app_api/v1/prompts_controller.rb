module AppApi
  module V1
    class PromptsController < BaseController
      include AppApi::TagAssignable

      before_action :set_prompt, only: [:show, :update, :destroy, :archive, :unarchive]

      def index
        prompts = current_user.prompts.includes(:category, :tags, :prompt_questions).ordered

        prompts = params[:archived] == 'true' ? prompts.archived : prompts.active
        prompts = prompts.where(category_id: params[:category_id]) if params[:category_id].present?

        if params[:search].present?
          term = "%#{params[:search]}%"
          prompts = prompts.left_outer_joins(:category, :tags)
                           .where(
                             "prompts.title ILIKE :s OR prompts.description ILIKE :s OR categories.name ILIKE :s OR tags.name ILIKE :s",
                             s: term
                           )
                           .group('prompts.id')
        end

        if params[:tag_id].present?
          prompts = prompts.joins(:tags).where(tags: { id: params[:tag_id] })
        end

        prompts = prompts.to_a
        counts = current_user.prompt_responses.where(prompt_id: prompts.map(&:id)).group(:prompt_id).count
        last_at = current_user.prompt_responses.where(prompt_id: prompts.map(&:id)).group(:prompt_id).maximum(:created_at)

        render json: prompts.map { |prompt|
          prompt_json(prompt).merge(
            response_count: counts[prompt.id] || 0,
            last_responded_at: last_at[prompt.id]
          )
        }
      end

      def show
        responses = @prompt.prompt_responses
                           .includes(prompt_answers: [:prompt_question, :rich_text_body])
                           .recent_first
                           .to_a

        render json: prompt_json(@prompt).merge(
          response_count: responses.length,
          last_responded_at: responses.first&.created_at,
          responses: responses.map { |r| response_json(r) }
        )
      end

      def create
        @prompt = current_user.prompts.build(prompt_params.except(:tag_names))
        @prompt.position = (current_user.prompts.maximum(:position) || 0) + 1

        if @prompt.save
          create_tags(@prompt, prompt_params[:tag_names])
          render json: { prompt: prompt_json(@prompt.reload) }, status: :created
        else
          render_errors @prompt.errors.full_messages
        end
      end

      def update
        if @prompt.update(prompt_params.except(:tag_names))
          assign_tags(@prompt, prompt_params[:tag_names]) if prompt_params.key?(:tag_names)
          render json: { prompt: prompt_json(@prompt.reload) }
        else
          render_errors @prompt.errors.full_messages
        end
      end

      def destroy
        @prompt.destroy
        render_success message: 'Prompt deleted.'
      end

      def archive
        @prompt.archive!
        render json: { prompt: prompt_json(@prompt) }
      end

      def unarchive
        @prompt.unarchive!
        render json: { prompt: prompt_json(@prompt) }
      end

      private

      def set_prompt
        @prompt = current_user.prompts.find(params[:id])
      end

      def prompt_params
        params.require(:prompt).permit(
          :title, :description, :category_id,
          tag_names: [],
          prompt_questions_attributes: [:id, :text, :question_type, :position, :_destroy, options: []]
        )
      end

      def prompt_json(prompt)
        prompt.as_json(only: [:id, :title, :description, :category_id, :position, :archived_at, :created_at, :updated_at])
              .merge(
                category: prompt.category&.as_json(only: [:id, :name, :color, :icon]),
                tags: prompt.tags.as_json(only: [:id, :name]),
                questions: prompt.prompt_questions.ordered.as_json(only: [:id, :text, :question_type, :options, :position])
              )
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
