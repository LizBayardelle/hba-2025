class PromptResponsesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_response, only: [:update, :destroy]

  def create
    @prompt = current_user.prompts.find(params[:prompt_id])
    @response = @prompt.prompt_responses.build(user: current_user)
    build_answers(@response, @prompt, params.dig(:prompt_response, :answers) || {})

    if @response.save
      respond_to do |format|
        format.html { redirect_to(params[:return_to].presence || prompts_path, notice: 'Response saved.') }
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
    update_answers(@response, params.dig(:prompt_response, :answers) || {})

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
    @response = current_user.prompt_responses.includes(prompt_answers: :prompt_question).find(params[:id])
  end

  # answers_param shape: { "<question_id>" => { text_value: "...", number_value: ..., yes_value: ..., selected_value: ..., body: "..." } }
  def build_answers(response, prompt, answers_param)
    prompt.prompt_questions.ordered.each do |q|
      raw = answers_param[q.id.to_s] || {}
      answer = response.prompt_answers.build(prompt_question: q)
      apply_value(answer, raw)
    end
  end

  def update_answers(response, answers_param)
    response.prompt.prompt_questions.ordered.each do |q|
      raw = answers_param[q.id.to_s] || {}
      answer = response.prompt_answers.find { |a| a.prompt_question_id == q.id } ||
               response.prompt_answers.build(prompt_question: q)
      apply_value(answer, raw)
    end
  end

  def apply_value(answer, raw)
    case answer.question_type
    when "short_answer"
      answer.text_value = raw[:text_value]
    when "long_answer"
      answer.body = raw[:body]
    when "integer"
      answer.number_value = raw[:number_value]
    when "yes_no"
      answer.yes_value = raw[:yes_value] unless raw[:yes_value].nil? || raw[:yes_value] == ""
    when "multiple_choice"
      answer.selected_value = raw[:selected_value]
    when "checkboxes"
      answer.selected_value = Array(raw[:selected_value]).reject(&:blank?)
    end
  end

  def response_json(response)
    response.as_json(only: [:id, :prompt_id, :created_at, :updated_at])
            .merge(answers: response.prompt_answers.map { |a|
              { prompt_question_id: a.prompt_question_id, response_value: a.response_value, body: a.body.to_s, display_value: a.display_value }
            })
  end
end
