module AppApi
  module V1
    class NotesController < BaseController
      include AppApi::TagAssignable

      before_action :set_note, only: [:show, :update, :destroy]

      def index
        notes = current_user.notes.includes(:category, :tags).active.recent_first

        if params[:search].present?
          search_term = "%#{params[:search]}%"
          notes = notes.left_outer_joins(:category, :tags)
                       .where(
                         "notes.title ILIKE :search OR notes.body ILIKE :search OR categories.name ILIKE :search OR tags.name ILIKE :search",
                         search: search_term
                       )
                       .group('notes.id')
        end

        notes = notes.where(category_id: params[:category_id]) if params[:category_id].present?

        if params[:tag_id].present?
          notes = notes.joins(:tags).where(tags: { id: params[:tag_id] })
        end

        notes = notes.order(Arel.sql('notes.pinned DESC, notes.created_at DESC'))

        render json: notes.map { |note|
          note.as_json(
            only: [:id, :title, :body, :pinned, :created_at, :updated_at],
            include: {
              tags: { only: [:id, :name] },
              category: { only: [:id, :name, :color, :icon] }
            }
          )
        }
      end

      def show
        render json: @note.as_json(
          only: [:id, :title, :body, :pinned, :category_id, :created_at, :updated_at],
          include: {
            tags: { only: [:id, :name] },
            category: { only: [:id, :name, :color, :icon] }
          }
        )
      end

      def create
        @note = current_user.notes.build(note_params.except(:tag_names))

        if @note.save
          create_tags(@note, note_params[:tag_names])
          render json: { note: @note.as_json(only: [:id, :title, :body, :pinned, :category_id]) }, status: :created
        else
          render_errors @note.errors.full_messages
        end
      end

      def update
        if @note.update(note_params.except(:tag_names))
          assign_tags(@note, note_params[:tag_names]) if note_params.key?(:tag_names)
          render json: { note: @note.as_json(only: [:id, :title, :body, :pinned, :category_id]) }
        else
          render_errors @note.errors.full_messages
        end
      end

      def destroy
        @note.destroy
        render_success message: 'Note deleted.'
      end

      private

      def set_note
        @note = current_user.notes.find(params[:id])
      end

      def note_params
        params.require(:note).permit(:title, :body, :category_id, :pinned, tag_names: [])
      end
    end
  end
end
