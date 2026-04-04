module AppApi
  module ListAttachable
    extend ActiveSupport::Concern

    private

    def sync_list_attachments(resource, param_key)
      new_ids = params[param_key][:list_attachment_ids]&.reject(&:blank?)&.map(&:to_i) || []
      current_ids = resource.list_attachments.pluck(:list_id)

      resource.list_attachments.where.not(list_id: new_ids).destroy_all

      (new_ids - current_ids).each do |list_id|
        resource.list_attachments.create!(list_id: list_id, user: current_user)
      end
    end

    def list_attachment_json(list_attachment)
      {
        id: list_attachment.id,
        list_id: list_attachment.list_id,
        list_name: list_attachment.list.name,
        list_category: list_attachment.list.category ? {
          id: list_attachment.list.category.id,
          name: list_attachment.list.category.name,
          color: list_attachment.list.category.color,
          icon: list_attachment.list.category.icon
        } : nil,
        checklist_items: list_attachment.list.checklist_items.ordered.map { |item|
          checklist_item_json(item)
        }
      }
    end
  end
end
