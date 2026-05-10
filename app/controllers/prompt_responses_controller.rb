class PromptResponsesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_response, only: [:update, :destroy]

  def create
    @prompt = current_user.prompts.find(params[:prompt_id])
    @response = @prompt.prompt_responses.build(user: current_user)
    apply_response_value(@response, @prompt)

    if @response.save
      respond_to do |format|
        format.html { redirect_to prompts_path, notice: 'Response saved.' }
        format.json { render json: response_json(@response), status: :created }
      end
    else
      respond_to do |format|
        format.html { redirect_to prompts_path, alert: "Error: #{@response.errors.full_messages.join(', ')}" }
        format.json { render json: { errors: @response.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    apply_response_value(@response, @response.prompt)

    if @response.save
      respond_to do |format|
        format.html { redirect_to prompt_path(@response.prompt), notice: 'Response updated.' }
        format.json { render json: response_json(@response) }
      end
    else
      respond_to do |format|
        format.html { redirect_to prompt_path(@response.prompt), alert: "Error: #{@response.errors.full_messages.join(', ')}" }
        format.json { render json: { errors: @response.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    prompt = @response.prompt
    @response.destroy
    respond_to do |format|
      format.html { redirect_to prompt_path(prompt), notice: 'Response deleted.' }
      format.json { head :no_content }
    end
  end

  private

  def set_response
    @response = current_user.prompt_responses.find(params[:id])
  end

  def response_params
    params.fetch(:prompt_response, {}).permit(:body, :text_value, :number_value, :yes_value, :selected_value, selected_value: [])
  end

  def apply_response_value(response, prompt)
    raw = params[:prompt_response] || {}
    case prompt.question_type
    when "short_answer"
      response.text_value = raw[:text_value]
    when "long_answer"
      response.body = raw[:body]
    when "integer"
      response.number_value = raw[:number_value]
    when "yes_no"
      response.yes_value = raw[:yes_value]
    when "multiple_choice"
      response.selected_value = raw[:selected_value]
    when "checkboxes"
      response.selected_value = Array(raw[:selected_value]).reject(&:blank?)
    end
  end

  def response_json(response)
    response.as_json(only: [:id, :prompt_id, :response_value, :created_at, :updated_at])
            .merge(body: response.body.to_s, display_value: response.display_value)
  end
end
