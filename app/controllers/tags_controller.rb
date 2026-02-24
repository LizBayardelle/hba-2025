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
            documents_count: tag.documents.count,
            tasks_count: tag.tasks.count,
            notes_count: tag.notes.count,
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
          documents: @tag.documents.ordered.map { |doc|
            {
              id: doc.id,
              type: 'document',
              title: doc.title,
              content_type: doc.content_type,
              habits: doc.habits.map { |h| { id: h.id, name: h.name, category_id: h.category_id } }
            }
          },
          tasks: @tag.tasks.order(created_at: :desc).map { |t|
            {
              id: t.id,
              type: 'task',
              name: t.name,
              completed: t.completed,
              category_id: t.category_id,
              category_name: t.category&.name,
              category_color: t.category&.color
            }
          },
          notes: @tag.notes.order(created_at: :desc).map { |n|
            {
              id: n.id,
              type: 'note',
              title: n.title,
              body: n.body.to_s.truncate(200),
              category_name: n.category&.name,
              category_color: n.category&.color
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
