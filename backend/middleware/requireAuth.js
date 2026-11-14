import jwt from 'jsonwebtoken'

function requireAuth(request, response, next) {
  const authorizationHeader = request.headers.authorization

  if (!process.env.JWT_SECRET) {
    return response.status(500).json({
      status: 'error',
      message: 'Sign-in is not configured on the server.',
    })
  }

  if (
    typeof authorizationHeader !== 'string' ||
    !authorizationHeader.startsWith('Bearer ')
  ) {
    return response.status(401).json({
      status: 'error',
      message: 'Sign in is required to access this information.',
    })
  }

  const token = authorizationHeader.slice('Bearer '.length)

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET)

    if (!decodedToken.sub) {
      return response.status(401).json({
        status: 'error',
        message: 'Your sign-in session is not valid. Please sign in again.',
      })
    }

    request.userId = decodedToken.sub
    return next()
  } catch {
    return response.status(401).json({
      status: 'error',
      message: 'Your sign-in session has expired or is not valid. Please sign in again.',
    })
  }
}

export default requireAuth