Rails.application.routes.draw do
  devise_for :users

  root to: 'home#index'

  get 'dashboard', to: 'dashboard#index'
  get 'habits', to: 'habits#index'
  get 'analytics', to: 'analytics#index'
  get 'documents', to: 'documents#index'
  get 'settings', to: 'settings#index'
  patch 'settings', to: 'settings#update'

  resources :categories, only: [:create, :update, :destroy, :show] do
    resources :habits, only: [:create, :update, :destroy]
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
