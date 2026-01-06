# Increase Rack's parameter size limit for rich text editor with large images
# Default is 4MB (4194304 bytes), increasing to 50MB
Rack::Utils.multipart_total_part_limit = 50_000_000
