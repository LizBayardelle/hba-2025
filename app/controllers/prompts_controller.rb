class PromptsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_prompt, only: [:show, :edit, :update, :destroy, :archive, :unarchive]

  def index
    @prompts = current_user.prompts.includes(:category, :tags, :prompt_questions).ordered

    if params[:archived] == 'true'
      @prompts = @prompts.archived
    else
      @prompts = @prompts.active
    end

    if params[:category_id].present?
      @prompts = @prompts.where(category_id: params[:category_id])
    end

    @response_counts = current_user.prompt_responses.group(:prompt_id).count
    @last_responded_at = current_user.prompt_responses.group(:prompt_id).maximum(:created_at)
    @available_categories = current_user.categories.active.ordered
    @available_tags = current_user.tags.order(:name)
  end

  def show
    @questions = @prompt.prompt_questions.ordered
    @responses = @prompt.prompt_responses
                        .includes(prompt_answers: [:prompt_question, :rich_text_body])
                        .recent_first
    @available_categories = current_user.categories.active.ordered
    @available_tags = current_user.tags.order(:name)
  end

  def edit
    @questions = @prompt.prompt_questions.ordered
    @available_categories = current_user.categories.active.ordered
    @available_tags = current_user.tags.order(:name)
  end

  # Drag reordering of the prompt list itself. Takes ids in their new order.
  def reorder
    ids = Array(params[:ids]).map(&:to_i)
    scoped = current_user.prompts.where(id: ids).index_by(&:id)

    ids.each_with_index do |id, index|
      scoped[id]&.update_column(:position, index)
    end

    render json: { success: true, count: scoped.size }
  end

  def create
    @prompt = current_user.prompts.build(prompt_params.except(:tag_names))
    max_position = current_user.prompts.maximum(:position) || 0
    @prompt.position = max_position + 1

    if @prompt.save
      assign_tags(@prompt, prompt_params[:tag_names])
      respond_to do |format|
        format.html { redirect_to prompts_path, notice: 'Prompt created.' }
        format.json { render json: prompt_json(@prompt), status: :created }
      end
    else
      respond_to do |format|
        format.html { redirect_to prompts_path, alert: "Error: #{@prompt.errors.full_messages.join(', ')}" }
        format.json { render json: { errors: @prompt.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    # Edits started from /prompts/:id/edit belong back on that prompt's log,
    # not on the index the modal used to return to.
    from_edit = params[:from] == 'edit'

    if @prompt.update(prompt_params.except(:tag_names))
      assign_tags(@prompt, prompt_params[:tag_names]) if prompt_params.key?(:tag_names)
      respond_to do |format|
        format.html { redirect_to(from_edit ? prompt_path(@prompt) : prompts_path, notice: 'Prompt updated.') }
        format.json { render json: prompt_json(@prompt) }
      end
    else
      respond_to do |format|
        format.html do
          if from_edit
            # Keep the user on the form rather than dumping them on the index
            @questions = @prompt.prompt_questions.ordered
            @available_categories = current_user.categories.active.ordered
            @available_tags = current_user.tags.order(:name)
            flash.now[:alert] = "Error: #{@prompt.errors.full_messages.join(', ')}"
            render :edit, status: :unprocessable_entity
          else
            redirect_to prompts_path, alert: "Error: #{@prompt.errors.full_messages.join(', ')}"
          end
        end
        format.json { render json: { errors: @prompt.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @prompt.destroy
    respond_to do |format|
      format.html { redirect_to prompts_path, notice: 'Prompt deleted.' }
      format.json { head :no_content }
    end
  end

  def archive
    @prompt.archive!
    redirect_to prompts_path, notice: 'Prompt archived.'
  end

  def unarchive
    @prompt.unarchive!
    redirect_to prompts_path(archived: true), notice: 'Prompt restored.'
  end

  private

  def set_prompt
    @prompt = current_user.prompts.find(params[:id])
  end

  def prompt_params
    params.require(:prompt).permit(
      :title, :description, :category_id, :tag_names,
      prompt_questions_attributes: [:id, :text, :question_type, :position, :_destroy, options: []]
    )
  end

  def assign_tags(prompt, names)
    return unless names
    list = names.is_a?(String) ? names.split(',') : Array(names)
    prompt.tags.clear
    list.map { |n| n.to_s.strip }.reject(&:blank?).each do |name|
      tag = current_user.tags.find_or_create_by(name: name)
      prompt.tags << tag unless prompt.tags.include?(tag)
    end
  end

  def prompt_json(prompt)
    prompt.as_json(only: [:id, :title, :description, :category_id, :position, :archived_at])
          .merge(
            tags: prompt.tags.pluck(:id, :name),
            questions: prompt.prompt_questions.ordered.as_json(only: [:id, :text, :question_type, :options, :position])
          )
  end
end
