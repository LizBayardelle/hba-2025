class PromptsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_prompt, only: [:show, :update, :destroy, :archive, :unarchive]

  def index
    @prompts = current_user.prompts.includes(:category, :tags).ordered

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
  end

  def show
    @responses = @prompt.prompt_responses.includes(:rich_text_body).recent_first
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
    if @prompt.update(prompt_params.except(:tag_names))
      assign_tags(@prompt, prompt_params[:tag_names]) if prompt_params.key?(:tag_names)
      respond_to do |format|
        format.html { redirect_to prompts_path, notice: 'Prompt updated.' }
        format.json { render json: prompt_json(@prompt) }
      end
    else
      respond_to do |format|
        format.html { redirect_to prompts_path, alert: "Error: #{@prompt.errors.full_messages.join(', ')}" }
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
    permitted = params.require(:prompt).permit(:title, :description, :category_id, :question_type, :tag_names, options: [])
    if permitted[:options].is_a?(Array)
      permitted[:options] = permitted[:options].map { |o| o.to_s.strip }.reject(&:blank?)
    end
    permitted
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
    prompt.as_json(only: [:id, :title, :description, :category_id, :position, :archived_at, :question_type, :options])
          .merge(tags: prompt.tags.pluck(:id, :name))
  end
end
