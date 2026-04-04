module AppApi
  module V1
    class JournalsController < BaseController
      include AppApi::TagAssignable

      before_action :set_journal, only: [:show, :update, :destroy]

      def index
        journals = current_user.journals.includes(:tags).recent_first

        if params[:search].present?
          journals = journals.joins(:rich_text_content)
                             .where("action_text_rich_texts.body ILIKE ?", "%#{params[:search]}%")
        end

        if params[:tag_id].present?
          journals = journals.joins(:tags).where(tags: { id: params[:tag_id] })
        end

        render json: journals.map { |journal| journal_json(journal) }
      end

      def show
        render json: journal_json(@journal)
      end

      def create
        @journal = current_user.journals.build(journal_params.except(:tag_names))

        if @journal.save
          create_tags(@journal, journal_params[:tag_names])
          render json: { journal: journal_json(@journal) }, status: :created
        else
          render_errors @journal.errors.full_messages
        end
      end

      def update
        if @journal.update(journal_params.except(:tag_names))
          assign_tags(@journal, journal_params[:tag_names]) if journal_params.key?(:tag_names)
          render json: { journal: journal_json(@journal) }
        else
          render_errors @journal.errors.full_messages
        end
      end

      def destroy
        @journal.destroy
        render_success message: 'Journal entry deleted.'
      end

      private

      def set_journal
        @journal = current_user.journals.find(params[:id])
      end

      def journal_params
        params.require(:journal).permit(:content, :private, tag_names: [])
      end

      def journal_json(journal)
        journal.as_json(
          only: [:id, :created_at, :updated_at, :private],
          include: { tags: { only: [:id, :name] } }
        ).merge(content: journal.content.to_s)
      end
    end
  end
end
