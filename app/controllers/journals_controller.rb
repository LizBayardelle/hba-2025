class JournalsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_journal, only: [:show, :update, :destroy]

  def index
    @journals = current_user.journals.includes(:tags).recent_first

    # Filter by search query if provided
    if params[:search].present?
      @journals = @journals.joins(:rich_text_content)
                           .where("action_text_rich_texts.body ILIKE ?", "%#{params[:search]}%")
    end

    # Filter by tag if provided
    if params[:tag_id].present?
      @journals = @journals.joins(:tags).where(tags: { id: params[:tag_id] })
    end

    respond_to do |format|
      format.html
      format.json {
        render json: @journals.map { |journal|
          journal.as_json(
            only: [:id, :created_at, :updated_at, :private],
            include: { tags: { only: [:id, :name] } }
          ).merge(content: journal.content.to_s)
        }
      }
    end
  end

  def show
    respond_to do |format|
      format.json {
        render json: @journal.as_json(
          only: [:id, :created_at, :updated_at, :private],
          include: { tags: { only: [:id, :name] } }
        ).merge(content: @journal.content.to_s)
      }
    end
  end

  def create
    @journal = current_user.journals.build(journal_params.except(:tag_names))

    if @journal.save
      # Handle tags
      if journal_params[:tag_names].present?
        tag_names = journal_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @journal.tags << tag unless @journal.tags.include?(tag)
        end
      end

      respond_to do |format|
        format.json { render json: { success: true, message: 'Journal entry created.' }, status: :created }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @journal.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    if @journal.update(journal_params.except(:tag_names))
      # Handle tags
      if journal_params[:tag_names]
        @journal.tags.clear
        tag_names = journal_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @journal.tags << tag unless @journal.tags.include?(tag)
        end
      end

      respond_to do |format|
        format.json { render json: { success: true, message: 'Journal entry updated.' }, status: :ok }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @journal.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @journal.destroy
    respond_to do |format|
      format.json { render json: { success: true, message: 'Journal entry deleted.' }, status: :ok }
    end
  end

  private

  def set_journal
    @journal = current_user.journals.find(params[:id])
  end

  def journal_params
    params.require(:journal).permit(:content, :private, tag_names: [])
  end
end
