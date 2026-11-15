const AUTH_STORAGE_KEY = 'gearbuddy-auth'

function hasExpired(token) {
  try {
    const payloadPart = token.split('.')[1]

    if (!payloadPart) {
      return false
    }

    const base64Payload = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payloadPart.length / 4) * 4, '=')

    const payload = JSON.parse(window.atob(base64Payload))

    return (
      typeof payload.exp === 'number' &&
      payload.exp * 1000 <= Date.now()
    )
  } catch {
    // If the browser cannot read the token, the backend will validate it.
    return false
  }
}

export function getAuthSession() {
  const browserStorages = [window.localStorage, window.sessionStorage]

  for (const storage of browserStorages) {
    try {
      const savedSession = storage.getItem(AUTH_STORAGE_KEY)

      if (!savedSession) {
        continue
      }

      const session = JSON.parse(savedSession)

      if (session && typeof session.token === 'string' && session.token) {
        if (hasExpired(session.token)) {
          storage.removeItem(AUTH_STORAGE_KEY)
          continue
        }

        return session
      }

      storage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      storage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  return null
}

export function getAuthToken() {
  return getAuthSession()?.token ?? null
}