module AppApi
  module V1
    class DashboardController < BaseController
      include AppApi::ChecklistRenderable

      def index
        today = if params[:date].present?
          date = Date.parse(params[:date])
          date > Time.zone.today ? Time.zone.today : date
        else
          Time.zone.today
        end

        # Habits due today
        all_habits = current_user.habits.active
          .includes(:category, :habit_completions, :importance_level, :time_block, :documents,
                    list_attachments: { list: :category })
        habits = all_habits.select { |h| h.due_on?(today) }

        today_completions = HabitCompletion.where(
          # habits is an Array here, and ActiveSupport's Array#pluck takes keys as
          # arguments — passing a block silently yields [nil, nil, ...], so this
          # matched no completions at all.
          habit_id: habits.map(&:id),
          completed_at: today
        ).group(:habit_id).sum(:count)

        # Group by time_block
        grouped = habits.group_by { |h| h.time_block || 'anytime' }
        grouped_habits = grouped.sort_by { |key, _| key == 'anytime' ? Float::INFINITY : key.rank }.to_h

        completed_today = habits.count { |h| (today_completions[h.id] || 0) >= h.target_count }
        total_habits = habits.count
        today_percentage = total_habits > 0 ? (completed_today * 100 / total_habits).round : 0

        # Tasks
        tasks = current_user.tasks.active.includes(:category, :importance_level, list_attachments: { list: :category })
        tasks_due_today = tasks.where(due_date: today)
        tasks_overdue = tasks.where('due_date < ?', today)
        tasks_no_date = tasks.where(due_date: nil)

        # Streak
        current_streak = 0
        date = today
        loop do
          completions = HabitCompletion.where(
            habit_id: habits.map(&:id),
            completed_at: date
          ).group(:habit_id).sum(:count)

          completed_count = habits.count { |h| (completions[h.id] || 0) >= h.target_count }

          if completed_count == habits.count && habits.count > 0
            current_streak += 1
            date -= 1.day
          else
            break
          end
        end

        tasks_completed_today = current_user.tasks.where(completed_at: today.beginning_of_day..today.end_of_day).count

        # Calendar events
        calendar_events = if current_user.google_sync_enabled && current_user.google_calendar_id.present?
          GoogleCalendarService.new(current_user).events_for_date(today)
        else
          []
        end

        # Prep questions
        prep_questions = current_user.prep_questions.active.ordered
        prep_responses = current_user.prep_responses.for_date(today).includes(:prep_question)

        # Projects block — mirrors dashboard/_projects_block.html.erb: progress
        # across top-level tasks, plus the next few open ones with their section.
        projects = current_user.projects.active.ordered
                               .includes(sections: :project_tasks)
                               .map { |project| project_summary(project) }

        render json: {
          date: today,
          dashboard_layout: current_user.dashboard_layout,
          projects: projects,
          habits: {
            groups: grouped_habits.map { |key, group_habits|
              {
                time_block: key == 'anytime' ? { name: 'Anytime' } : {
                  id: key.id, name: key.name, icon: key.icon, color: key.color, rank: key.rank
                },
                habits: group_habits.map { |habit|
                  {
                    id: habit.id,
                    name: habit.name,
                    target_count: habit.target_count,
                    today_count: today_completions[habit.id] || 0,
                    health: habit.health,
                    health_state: habit.health_state,
                    category_name: habit.category&.name,
                    category_color: habit.category&.color,
                    category_icon: habit.category&.icon,
                    importance_level: habit.importance_level ? {
                      id: habit.importance_level.id,
                      name: habit.importance_level.name,
                      icon: habit.importance_level.icon,
                      color: habit.importance_level.color
                    } : nil
                  }
                }
              }
            },
            completed: completed_today,
            total: total_habits,
            percentage: today_percentage
          },
          tasks: {
            due_today: tasks_due_today.map { |t| task_summary(t) },
            overdue: tasks_overdue.map { |t| task_summary(t) },
            no_date: tasks_no_date.map { |t| task_summary(t) },
            completed_today: tasks_completed_today
          },
          stats: {
            current_streak: current_streak
          },
          calendar_events: calendar_events,
          prep: {
            questions: prep_questions.as_json(only: [:id, :question_type, :question_text, :options, :allow_multiple, :position]),
            responses: prep_responses.map { |r|
              r.as_json(only: [:id, :prep_question_id, :response_date, :response_value])
                .merge(long_response: r.long_response.to_s)
            }
          }
        }
      end

      private

      PROJECT_TASK_PREVIEW = 3

      def project_summary(project)
        all_tasks = project.sections.reject(&:archived).flat_map { |section|
          section.project_tasks.reject { |t| t.archived? || t.parent_id.present? }
        }
        completed = all_tasks.count(&:completed)

        # Open tasks in section order, carrying the section name for grouping.
        upcoming = project.sections.reject(&:archived).sort_by { |s| s.position || 0 }.flat_map { |section|
          section.project_tasks
                 .reject { |t| t.archived? || t.parent_id.present? || t.completed }
                 .sort_by { |t| t.position || 0 }
                 .map { |task| { id: task.id, name: task.name, section_name: section.name } }
        }

        {
          id: project.id,
          name: project.name,
          color: project.color,
          icon: project.icon,
          total_tasks: all_tasks.length,
          completed_tasks: completed,
          progress: all_tasks.any? ? (completed * 100.0 / all_tasks.length).round : 0,
          upcoming_tasks: upcoming.first(PROJECT_TASK_PREVIEW),
          remaining_count: [upcoming.length - PROJECT_TASK_PREVIEW, 0].max
        }
      end

      def task_summary(task)
        {
          id: task.id,
          name: task.name,
          due_date: task.due_date,
          due_time: task.due_time,
          category_name: task.category&.name,
          category_color: task.category&.color,
          category_icon: task.category&.icon,
          importance_level: task.importance_level ? {
            id: task.importance_level.id,
            name: task.importance_level.name,
            icon: task.importance_level.icon,
            color: task.importance_level.color
          } : nil
        }
      end
    end
  end
end
