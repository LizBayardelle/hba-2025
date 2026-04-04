module AppApi
  module V1
    class DocumentsController < BaseController
      include AppApi::TagAssignable

      before_action :set_document, only: [:show, :update, :destroy, :toggle_pin]

      def index
        documents = Document.left_joins(:habits)
          .where('habits.id IS NULL OR habits.user_id = ?', current_user.id)
          .distinct
          .includes(habits: :category, tasks: [], tags: [], categories: [], files_attachments: :blob)
          .order(pinned: :desc, created_at: :desc)

        render json: documents.map { |doc| document_json(doc) }
      end

      def show
        render json: document_json(@document)
      end

      def create
        @document = Document.new(document_params.except(:habit_ids, :task_ids, :tag_names, :category_ids))

        habit_ids = params[:document][:habit_ids]&.reject(&:blank?)
        task_ids = params[:document][:task_ids]&.reject(&:blank?)
        category_ids = params[:document][:category_ids]&.reject(&:blank?)

        if @document.save
          @document.habit_ids = habit_ids if habit_ids.present?
          @document.task_ids = task_ids if task_ids.present?
          @document.category_ids = category_ids if category_ids.present?

          create_tags(@document, params[:document][:tag_names]&.reject(&:blank?))

          render json: { document: document_json(@document) }, status: :created
        else
          render_errors @document.errors.full_messages
        end
      end

      def update
        habit_ids = params[:document][:habit_ids]&.reject(&:blank?)
        task_ids = params[:document][:task_ids]&.reject(&:blank?)
        category_ids = params[:document][:category_ids]&.reject(&:blank?)

        if params[:document][:remove_file_ids].present?
          params[:document][:remove_file_ids].each do |file_id|
            attachment = @document.files.find { |f| f.id.to_s == file_id.to_s }
            attachment&.purge_later
          end
        end

        if @document.update(document_params.except(:habit_ids, :task_ids, :tag_names, :category_ids, :remove_file_ids))
          @document.habit_ids = habit_ids if habit_ids
          @document.task_ids = task_ids if task_ids
          @document.category_ids = category_ids if category_ids

          if params[:document][:tag_names]
            assign_tags(@document, params[:document][:tag_names].reject(&:blank?))
          end

          render json: { document: document_json(@document) }
        else
          render_errors @document.errors.full_messages
        end
      end

      def destroy
        @document.destroy
        render_success message: 'Document deleted.'
      end

      def toggle_pin
        new_pinned = !@document.pinned
        @document.update_column(:pinned, new_pinned)
        render json: { pinned: new_pinned }
      end

      private

      def set_document
        @document = Document.find(params[:id])
        unless @document.habits.empty? ? true : @document.habits.joins(:user).where(users: { id: current_user.id }).exists?
          render_error 'Access denied', status: :forbidden
        end
      end

      def document_params
        params.require(:document).permit(
          :content_type, :title, :body, :position, :pinned,
          metadata: {}, habit_ids: [], task_ids: [], tag_names: [], category_ids: [],
          files: [], remove_file_ids: []
        )
      end

      def document_json(doc)
        doc.as_json(
          include: {
            habits: { only: [:id, :name] },
            tasks: { only: [:id, :name] },
            tags: { only: [:id, :name] },
            categories: { only: [:id, :name, :color, :icon] }
          },
          methods: [:youtube_embed_url]
        ).merge(
          body: doc.body.to_s,
          files: doc.files.map { |file|
            {
              id: file.id,
              filename: file.filename.to_s,
              content_type: file.content_type,
              byte_size: file.byte_size,
              url: Rails.application.routes.url_helpers.rails_blob_path(file, only_path: true)
            }
          }
        )
      end
    end
  end
end
