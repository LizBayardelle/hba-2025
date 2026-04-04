module AppApi
  module ChecklistRenderable
    extend ActiveSupport::Concern

    private

    def checklist_item_json(item)
      {
        id: item.id,
        name: item.name,
        completed: item.completed,
        completed_at: item.completed_at,
        position: item.position
      }
    end
  end
end
