module AppApi
  module TagAssignable
    extend ActiveSupport::Concern

    private

    def assign_tags(resource, tag_names)
      return unless tag_names

      resource.tags.clear
      tag_names.reject(&:blank?).each do |tag_name|
        tag = current_user.tags.find_or_create_by(name: tag_name.strip)
        resource.tags << tag unless resource.tags.include?(tag)
      end
    end

    def create_tags(resource, tag_names)
      return unless tag_names.present?

      tag_names.reject(&:blank?).each do |tag_name|
        tag = current_user.tags.find_or_create_by(name: tag_name.strip)
        resource.tags << tag unless resource.tags.include?(tag)
      end
    end
  end
end
