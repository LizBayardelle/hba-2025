class TagsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_tag, only: [:show, :update, :destroy]

  def index
    @tags = current_user.tags.includes(:taggings)

    respond_to do |format|
      format.html
      format.json do
        render json: @tags.map { |tag|
          {
            id: tag.id,
            name: tag.name,
            journals_count: tag.journals.count,
            habits_count: tag.habits.count,
            habit_contents_count: tag.habit_contents.count,
            total_count: tag.taggings.count
          }
        }
      end
    end
  end

  def show
    respond_to do |format|
      format.html
      format.json do
        render json: {
          id: @tag.id,
          name: @tag.name,
          journals: @tag.journals.recent_first.map { |j|
            {
              id: j.id,
              type: 'journal',
              created_at: j.created_at,
              content: j.content.to_s.truncate(200)
            }
          },
          habits: @tag.habits.active.map { |h|
            {
              id: h.id,
              type: 'habit',
              name: h.name,
              category_id: h.category_id,
              category_name: h.category.name,
              category_color: h.category.color
            }
          },
          habit_contents: @tag.habit_contents.ordered.map { |hc|
            {
              id: hc.id,
              type: 'habit_content',
              title: hc.title,
              content_type: hc.content_type,
              habits: hc.habits.map { |h| { id: h.id, name: h.name, category_id: h.category_id } }
            }
          }
        }
      end
    end
  end

  def update
    if @tag.update(tag_params)
      respond_to do |format|
        format.json { render json: { success: true, message: 'Tag updated.' }, status: :ok }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @tag.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @tag.destroy
    respond_to do |format|
      format.json { render json: { success: true, message: 'Tag deleted.' }, status: :ok }
    end
  end

  private

  def set_tag
    @tag = current_user.tags.find(params[:id])
  end

  def tag_params
    params.require(:tag).permit(:name)
  end
end
