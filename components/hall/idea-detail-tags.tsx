'use client'

interface IdeaDetailTagsProps {
  tags: { id: string; name: string; color: string }[]
  onTagClick?: (tagId: string) => void
}

export function IdeaDetailTags({ tags, onTagClick }: IdeaDetailTagsProps) {
  if (tags.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
        Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onTagClick?.(tag.id)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  )
}
