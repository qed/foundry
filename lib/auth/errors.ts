export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AuthError {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

// Handle errors in API routes — returns appropriate HTTP responses
export function handleAuthError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: error.message }, { status: 401 })
  }

  if (error instanceof ForbiddenError) {
    return Response.json({ error: error.message }, { status: 403 })
  }

  if (error instanceof NotFoundError) {
    return Response.json({ error: error.message }, { status: 404 })
  }

  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
