class HabitsController < ApplicationController
  def index
    return redirect_to new_user_session_path unless user_signed_in?

    @view_mode = params[:view] || 'category' # 'category' or 'time'
    @selected_date = params[:date] ? Date.parse(params[:date]) : Time.zone.today

    @habits = current_user.habits.active.includes(:category, :habit_completions, :tags, :documents, :importance_level, :time_block)

    # Get today's completions
    @completions = HabitCompletion.where(
      habit_id: @habits.pluck(:id),
      completed_at: @selected_date
    ).group(:habit_id).sum(:count)

    # Calculate streaks as of the selected date
    @streaks = {}
    @habits.each do |habit|
      # Calculate current streak (including selected date if completed)
      current_streak = 0
      date = @selected_date

      loop do
        completion = HabitCompletion.find_by(
          habit_id: habit.id,
          completed_at: date
        )

        if completion && completion.count >= habit.target_count
          current_streak += 1
          date -= 1.day
        else
          break
        end
      end

      # If selected date is not completed, check if there's a streak from yesterday
      # This shows the "at risk" streak that could continue if they complete today
      if current_streak == 0
        yesterday = @selected_date - 1.day
        yesterday_completion = HabitCompletion.find_by(
          habit_id: habit.id,
          completed_at: yesterday
        )

        if yesterday_completion && yesterday_completion.count >= habit.target_count
          # Count the streak from yesterday backwards
          streak_from_yesterday = 0
          date = yesterday

          loop do
            completion = HabitCompletion.find_by(
              habit_id: habit.id,
              completed_at: date
            )

            if completion && completion.count >= habit.target_count
              streak_from_yesterday += 1
              date -= 1.day
            else
              break
            end
          end

          @streaks[habit.id] = streak_from_yesterday
        else
          @streaks[habit.id] = 0
        end
      else
        @streaks[habit.id] = current_streak
      end
    end

    # Group habits based on view mode
    if @view_mode == 'time'
      # Group by time_block, with "Anytime" for null time_blocks
      @grouped_habits = @habits.group_by { |h| h.time_block || 'anytime' }
                               .sort_by { |key, _| key == 'anytime' ? Float::INFINITY : key.rank }
                               .to_h
    else
      @grouped_habits = @habits.group_by(&:category)
    end

    # Today's stats
    @completed_today = @habits.count { |h| (@completions[h.id] || 0) >= h.target_count }
    @total_habits = @habits.count
    @today_percentage = @total_habits > 0 ? (@completed_today * 100 / @total_habits).round : 0

    respond_to do |format|
      format.html
      format.json {
        render json: {
          habits: @habits.map { |habit|
            habit.as_json(
              only: [:id, :name, :target_count, :frequency_type, :time_of_day, :importance, :importance_level_id, :category_id, :time_block_id]
            ).merge(
              today_count: @completions[habit.id] || 0,
              current_streak: @streaks[habit.id] || 0,
              category_name: habit.category.name,
              category_icon: habit.category.icon,
              category_color: habit.category.color,
              time_block_name: habit.time_block&.name,
              time_block_icon: habit.time_block&.icon,
              time_block_color: habit.time_block&.color,
              time_block_rank: habit.time_block&.rank,
              importance_level: habit.importance_level ? {
                id: habit.importance_level.id,
                name: habit.importance_level.name,
                icon: habit.importance_level.icon,
                color: habit.importance_level.color,
                rank: habit.importance_level.rank
              } : nil,
              tags: habit.tags.map { |t| { id: t.id, name: t.name } },
              documents: habit.documents.map { |c| { id: c.id, title: c.title, content_type: c.content_type } },
              habit_contents: habit.documents.map { |c| { id: c.id, title: c.title } }
            )
          }
        }
      }
    end
  end

  def show
    @category = current_user.categories.find(params[:category_id])
    @habit = @category.habits.find(params[:id])

    respond_to do |format|
      format.json {
        render json: @habit.as_json(
          only: [:id, :name, :target_count, :frequency_type, :time_of_day, :importance, :category_id, :time_block_id, :importance_level_id],
          include: {
            tags: { only: [:id, :name] },
            documents: { only: [:id, :title] }
          }
        ).merge(
          habit_contents: @habit.documents.map { |doc| { id: doc.id, title: doc.title } }
        )
      }
    end
  end

  def create
    @category = current_user.categories.find(params[:category_id])
    @habit = @category.habits.build(habit_params)
    @habit.user = current_user

    if @habit.save
      respond_to do |format|
        format.html { redirect_to category_path(@category), notice: 'Habit created successfully.' }
        format.json { render json: { success: true, message: 'Habit created successfully.', habit: @habit }, status: :created }
      end
    else
      respond_to do |format|
        format.html { redirect_to category_path(@category), alert: 'Failed to create habit.' }
        format.json { render json: { success: false, errors: @habit.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    @category = current_user.categories.find(params[:category_id])
    @habit = @category.habits.find(params[:id])

    if @habit.update(habit_params)
      respond_to do |format|
        format.html { redirect_to category_path(@category), notice: 'Habit updated successfully.' }
        format.json { render json: { success: true, message: 'Habit updated successfully.', habit: @habit }, status: :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to category_path(@category), alert: 'Failed to update habit.' }
        format.json { render json: { success: false, errors: @habit.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @category = current_user.categories.find(params[:category_id])
    @habit = @category.habits.find(params[:id])
    @habit.destroy

    respond_to do |format|
      format.html { redirect_to category_path(@category), notice: 'Habit deleted successfully.' }
      format.json { render json: { success: true, message: 'Habit deleted successfully.' }, status: :ok }
    end
  end

  private

  def habit_params
    params.require(:habit).permit(:name, :description, :target_count, :frequency_type, :time_of_day, :time_block_id, :importance, :importance_level_id, :category_id, :reminder_enabled, :start_date, :positive, :difficulty, tag_names: [], habit_content_ids: [])
  end
end
