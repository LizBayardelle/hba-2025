class NotesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_note, only: [:show, :update, :destroy]

  def index
    @notes = current_user.notes.includes(:category, :tags).active.recent_first

    if params[:search].present?
      search_term = "%#{params[:search]}%"
      @notes = @notes.left_outer_joins(:category, :tags)
                     .where(
                       "notes.title ILIKE :search OR
                        notes.body ILIKE :search OR
                        categories.name ILIKE :search OR
                        tags.name ILIKE :search",
                       search: search_term
                     )
                     .group('notes.id')
    end

    if params[:category_id].present?
      @notes = @notes.where(category_id: params[:category_id])
    end

    if params[:tag_id].present?
      @notes = @notes.joins(:tags).where(tags: { id: params[:tag_id] })
    end

    # Pinned notes first, then by created_at desc
    @notes = @notes.order(Arel.sql('notes.pinned DESC, notes.created_at DESC'))

    respond_to do |format|
      format.html
      format.json {
        render json: @notes.map { |note|
          note.as_json(
            only: [:id, :title, :body, :pinned, :created_at, :updated_at],
            include: {
              tags: { only: [:id, :name] },
              category: { only: [:id, :name, :color, :icon] }
            }
          )
        }
      }
    end
  end

  def show
    respond_to do |format|
      format.json {
        render json: @note.as_json(
          only: [:id, :title, :body, :pinned, :category_id, :created_at, :updated_at],
          include: {
            tags: { only: [:id, :name] },
            category: { only: [:id, :name, :color, :icon] }
          }
        )
      }
    end
  end

  def create
    @note = current_user.notes.build(note_params.except(:tag_names))

    if @note.save
      if note_params[:tag_names].present?
        tag_names = note_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @note.tags << tag unless @note.tags.include?(tag)
        end
      end

      respond_to do |format|
        format.json { render json: { success: true, message: 'Note created.', note: @note }, status: :created }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @note.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    if @note.update(note_params.except(:tag_names))
      if note_params[:tag_names]
        @note.tags.clear
        tag_names = note_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @note.tags << tag unless @note.tags.include?(tag)
        end
      end

      respond_to do |format|
        format.json { render json: { success: true, message: 'Note updated.', note: @note }, status: :ok }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @note.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @note.destroy
    respond_to do |format|
      format.json { render json: { success: true, message: 'Note deleted.' }, status: :ok }
    end
  end

  private

  def set_note
    @note = current_user.notes.find(params[:id])
  end

  def note_params
    params.require(:note).permit(:title, :body, :category_id, :pinned, tag_names: [])
  end
end
