Rails.application.routes.draw do
  devise_for :users

  root to: 'home#index'

  get 'dashboard', to: 'dashboard#index'
  get 'habits', to: 'habits#index'
  get 'analytics', to: 'analytics#index'
  get 'documents', to: 'documents#index'
  get 'journal', to: 'journals#index'
  get 'tasks', to: 'tasks#index'
  get 'tags', to: 'tags#index'
  get 'settings', to: 'settings#index'
  patch 'settings', to: 'settings#update'

  get 'settings/importance_levels', to: 'settings#importance_levels'
  post 'settings/importance_levels', to: 'settings#create_importance_level'
  get 'settings/importance_levels/:id', to: 'settings#show_importance_level'
  patch 'settings/importance_levels/:id', to: 'settings#update_importance_level'
  delete 'settings/importance_levels/:id', to: 'settings#destroy_importance_level'

  get 'settings/time_blocks', to: 'settings#time_blocks'
  post 'settings/time_blocks', to: 'settings#create_time_block'
  get 'settings/time_blocks/:id', to: 'settings#show_time_block'
  patch 'settings/time_blocks/:id', to: 'settings#update_time_block'
  delete 'settings/time_blocks/:id', to: 'settings#destroy_time_block'

  # Google Calendar routes
  get 'google_calendar/connect', to: 'google_calendar#connect', as: :google_calendar_connect
  get 'google_calendar/callback', to: 'google_calendar#callback', as: :google_calendar_callback
  get 'google_calendar/calendars', to: 'google_calendar#calendars', as: :google_calendar_calendars
  patch 'google_calendar/select', to: 'google_calendar#select_calendar', as: :google_calendar_select
  delete 'google_calendar/disconnect', to: 'google_calendar#disconnect', as: :google_calendar_disconnect
  post 'google_calendar/refresh', to: 'google_calendar#refresh', as: :google_calendar_refresh

  # Legal pages
  get 'privacy', to: 'legal#privacy', as: :privacy
  get 'terms', to: 'legal#terms', as: :terms

  resources :journals, only: [:index, :show, :create, :update, :destroy]
  resources :tasks, only: [:index, :show, :create, :update, :destroy]
  resources :tags, only: [:index, :show, :update, :destroy]

  resources :categories, only: [:index, :create, :update, :destroy, :show] do
    resources :habits, only: [:show, :create, :update, :destroy]
  end

  resources :habits, only: [] do
    post 'completions/increment', to: 'habit_completions#increment'
    post 'completions/decrement', to: 'habit_completions#decrement'
  end

  resources :habit_contents, path: 'contents' do
    member do
      post 'attach_habit'
      delete 'detach_habit/:habit_id', action: :detach_habit, as: :detach_habit
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
end
