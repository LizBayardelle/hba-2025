class HabitContentsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_habit_content, only: [:show, :edit, :update, :destroy, :attach_habit, :detach_habit]

  def index
    respond_to do |format|
      format.html { redirect_to documents_path }
      format.json {
        @habit_contents = Document.left_joins(:habits)
                                       .where('habits.id IS NULL OR habits.user_id = ?', current_user.id)
                                       .distinct
                                       .includes(habits: :category, tags: [])
                                       .order(created_at: :desc)

        render json: @habit_contents.map { |content|
          content.as_json(
            include: {
              habits: { only: [:id, :name] },
              tags: { only: [:id, :name] }
            },
            methods: [:youtube_embed_url]
          ).merge(body: content.body.to_s)
        }
      }
    end
  end

  def show
    # For modal display
    respond_to do |format|
      format.html { render layout: false }
      format.json {
        render json: @habit_content.as_json(
          include: {
            habits: { only: [:id, :name] },
            tags: { only: [:id, :name] }
          },
          methods: [:youtube_embed_url]
        ).merge(body: @habit_content.body.to_s)
      }
    end
  end

  def new
    @habit_content = @habit.habit_contents.build
  end

  def create
    @habit_content = Document.new(habit_content_params.except(:habit_ids, :tag_names))

    # Attach selected habits if any
    habit_ids = params[:habit_content][:habit_ids].reject(&:blank?) if params[:habit_content][:habit_ids]

    if @habit_content.save
      @habit_content.habit_ids = habit_ids if habit_ids.present?

      # Handle tags
      if params[:habit_content][:tag_names].present?
        tag_names = params[:habit_content][:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @habit_content.tags << tag unless @habit_content.tags.include?(tag)
        end
      end

      if request.format.json? || request.content_type == 'application/json'
        render json: { success: true, message: 'Content added successfully.', content: @habit_content }, status: :created
      else
        redirect_back fallback_location: documents_path, notice: 'Content added successfully.'
      end
    else
      if request.format.json? || request.content_type == 'application/json'
        render json: { success: false, errors: @habit_content.errors.full_messages }, status: :unprocessable_entity
      else
        render :new, status: :unprocessable_entity
      end
    end
  end

  def edit
  end

  def update
    # Handle habit associations separately
    habit_ids = params[:habit_content][:habit_ids].reject(&:blank?) if params[:habit_content][:habit_ids]

    if @habit_content.update(habit_content_params.except(:habit_ids, :tag_names))
      @habit_content.habit_ids = habit_ids if habit_ids

      # Handle tags
      if params[:habit_content][:tag_names]
        @habit_content.tags.clear
        tag_names = params[:habit_content][:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @habit_content.tags << tag unless @habit_content.tags.include?(tag)
        end
      end

      if request.format.json? || request.content_type == 'application/json'
        render json: { success: true, message: 'Content updated successfully.', content: @habit_content }, status: :ok
      else
        redirect_back fallback_location: documents_path, notice: 'Content updated successfully.'
      end
    else
      if request.format.json? || request.content_type == 'application/json'
        render json: { success: false, errors: @habit_content.errors.full_messages }, status: :unprocessable_entity
      else
        render :edit, status: :unprocessable_entity
      end
    end
  end

  def attach_habit
    habit = current_user.habits.find(params[:habit_id])
    @habit_content.habits << habit unless @habit_content.habits.include?(habit)

    respond_to do |format|
      format.json { render json: { success: true, message: 'Habit attached successfully.' }, status: :ok }
    end
  end

  def detach_habit
    habit = current_user.habits.find(params[:habit_id])
    @habit_content.habits.delete(habit)

    respond_to do |format|
      format.json { render json: { success: true, message: 'Habit detached successfully.' }, status: :ok }
    end
  end

  def destroy
    @habit_content.destroy

    if request.format.json? || request.content_type == 'application/json'
      render json: { success: true, message: 'Content deleted successfully.' }, status: :ok
    else
      redirect_back fallback_location: documents_path, notice: 'Content deleted successfully.'
    end
  end

  private

  def set_habit_content
    @habit_content = Document.find(params[:id])
    # Ensure user has access through at least one of their habits, or if unattached
    unless @habit_content.habits.empty? ? true : @habit_content.habits.joins(:user).where(users: { id: current_user.id }).exists?
      redirect_to documents_path, alert: 'Access denied'
    end
  end

  def habit_content_params
    params.require(:habit_content).permit(:content_type, :title, :body, :position, metadata: {}, habit_ids: [], tag_names: [])
  end
end
