module AppApi
  module V1
    class AnalyticsController < BaseController
      HEATMAP_DAYS = 90
      TREND_WEEKS = 12
      AT_RISK_HEALTH = 40
      TOP_STREAK_COUNT = 5

      # Mirrors AnalyticsController#index, but loads every completion once and
      # does the per-day maths in memory. The web version runs a query per day
      # for the heatmap and another per day since the first completion for the
      # best streak, which is far too many round trips for a mobile request.
      def index
        habits = current_user.habits.active.includes(:category, :importance_level, :time_block).to_a
        habit_ids = habits.map(&:id)
        today = Time.zone.today

        # { Date => { habit_id => count } }
        counts_by_date = Hash.new { |h, k| h[k] = Hash.new(0) }
        if habit_ids.any?
          current_user.habit_completions
                      .where(habit_id: habit_ids)
                      .pluck(:completed_at, :habit_id, :count)
                      .each do |completed_at, habit_id, count|
            next if completed_at.nil?
            counts_by_date[completed_at.to_date][habit_id] += count.to_i
          end
        end

        perfect_day = ->(date) {
          return false if habits.empty?
          day = counts_by_date[date]
          habits.all? { |h| day[h.id] >= h.target_count }
        }

        # Current perfect-day streak, walking back from today.
        perfect_streak = 0
        unless habits.empty?
          cursor = today
          while perfect_day.call(cursor)
            perfect_streak += 1
            cursor -= 1
          end
        end

        # Best perfect-day streak ever.
        best_streak = 0
        unless habits.empty?
          oldest = counts_by_date.keys.min
          if oldest
            run = 0
            (oldest..today).each do |date|
              if perfect_day.call(date)
                run += 1
                best_streak = run if run > best_streak
              else
                run = 0
              end
            end
          end
        end

        overall_health = habits.any? ? (habits.sum { |h| [h.health, 100].min }.to_f / habits.count).round : 0

        completions_by_habit = Hash.new(0)
        counts_by_date.each_value do |day|
          day.each { |habit_id, count| completions_by_habit[habit_id] += count }
        end

        heatmap = HEATMAP_DAYS.downto(0).map do |days_ago|
          date = today - days_ago.days
          day = counts_by_date[date]
          done = habits.count { |h| day[h.id] >= h.target_count }
          {
            date: date.to_s,
            percentage: habits.any? ? (done * 100.0 / habits.count).round : 0,
            completed: done,
            total: habits.count
          }
        end

        weekly_trend = TREND_WEEKS.downto(0).map do |weeks_ago|
          week_start = today.beginning_of_week - weeks_ago.weeks
          week_end = [week_start.end_of_week, today].min
          days = (week_start..week_end).to_a
          perfect = days.count { |d| perfect_day.call(d) }
          {
            label: week_start.strftime('%b %-d'),
            perfect_days: perfect,
            total_days: days.length,
            percentage: days.any? ? (perfect * 100.0 / days.length).round : 0
          }
        end

        category_stats = current_user.categories.active.ordered.map do |category|
          cat_habits = habits.select { |h| h.category_id == category.id }
          next if cat_habits.empty?

          best = cat_habits.max_by(&:current_streak)
          {
            id: category.id,
            name: category.name,
            color: category.color,
            icon: category.icon,
            habits_count: cat_habits.count,
            avg_health: (cat_habits.sum(&:health).to_f / cat_habits.count).round,
            total_completions: cat_habits.sum { |h| completions_by_habit[h.id] },
            best_habit: best&.name,
            best_streak: best&.current_streak || 0
          }
        end.compact

        week_start = today.beginning_of_week

        render json: {
          display: current_user.analytics_display,
          totals: {
            days_active: (today - current_user.created_at.to_date).to_i,
            lifetime_completions: current_user.habit_completions.sum(:count),
            tasks_completed: current_user.tasks.where(completed: true).count,
            journal_entries: current_user.journals.count,
            goals_completed: current_user.goals.where(completed: true).count,
            goals_total: current_user.goals.count,
            active_habits: habits.count
          },
          streaks: {
            perfect_streak: perfect_streak,
            best_streak: best_streak,
            overall_health: overall_health
          },
          top_streaks: habits.sort_by { |h| -h.current_streak }.first(TOP_STREAK_COUNT).map { |h|
            {
              id: h.id,
              name: h.name,
              streak: h.current_streak,
              health: h.health,
              color: h.category&.color
            }
          },
          at_risk: habits.select { |h| h.health < AT_RISK_HEALTH }
                         .sort_by(&:health)
                         .map { |h|
            {
              id: h.id,
              name: h.name,
              health: h.health,
              color: h.category&.color,
              last_completed: h.last_completed_at
            }
          },
          heatmap: heatmap,
          weekly_trend: weekly_trend,
          category_stats: category_stats,
          this_week: {
            completions: current_user.habit_completions.where(completed_at: week_start..today).sum(:count),
            tasks_done: current_user.tasks.where(completed: true, completed_at: week_start.beginning_of_day..Time.zone.now).count,
            journal_entries: current_user.journals.where(created_at: week_start.beginning_of_day..Time.zone.now).count,
            notes_created: current_user.notes.where(created_at: week_start.beginning_of_day..Time.zone.now).count,
            prep_answered: current_user.prep_responses.where(response_date: week_start..today).count
          },
          habits: habits.sort_by { |h| [-h.current_streak, h.name.downcase] }.map { |h|
            {
              id: h.id,
              name: h.name,
              current_streak: h.current_streak,
              health: h.health,
              health_state: h.health_state,
              target_count: h.target_count,
              total_completions: completions_by_habit[h.id],
              last_completed: h.last_completed_at,
              category: h.category&.as_json(only: [:id, :name, :color, :icon])
            }
          }
        }
      end
    end
  end
end
