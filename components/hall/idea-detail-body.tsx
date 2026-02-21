'use client'

interface IdeaDetailBodyProps {
  body: string
}

export function IdeaDetailBody({ body }: IdeaDetailBodyProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
        Description
      </h3>
      <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed max-w-prose">
        {body}
      </div>
    </div>
  )
}
