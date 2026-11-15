import { useState } from 'react'
import './SignInPage.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const AUTH_STORAGE_KEY = 'gearbuddy-auth'

function saveAuthSession(session, rememberMe) {
  const serializedSession = JSON.stringify(session)

  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)

  if (rememberMe) {
    localStorage.setItem(AUTH_STORAGE_KEY, serializedSession)
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, serializedSession)
  }
}

function SignInPage({ Header }) {
  const isSignUp = window.location.hash === '#sign-up'
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setNotice('')
    setErrorMessage('')

    const form = event.currentTarget
    const formData = new FormData(form)
    const password = formData.get('password')

    if (isSignUp) {
      const confirmPassword = formData.get('confirmPassword')

      if (password !== confirmPassword) {
        setErrorMessage('The passwords do not match. Please check them and try again.')
        return
      }
    }

    const requestBody = {
      email: formData.get('email'),
      password,
    }

    if (isSignUp) {
      requestBody.fullName = formData.get('fullName')
    }

    const rememberMe =
      !isSignUp && formData.get('rememberMe') === 'on'

    setIsSubmitting(true)

    try {
      const endpoint = isSignUp ? 'signup' : 'signin'
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Your request could not be completed.')
      }

      saveAuthSession(
        {
          token: result.token,
          user: result.user,
        },
        rememberMe,
      )

      setNotice(
        isSignUp
          ? 'Your account was created and you are signed in.'
          : 'You are signed in successfully.',
      )
      form.reset()
      setShowPassword(false)
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Could not connect to GearBuddy. Check that the backend is running and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="account-page">
      <Header activePage="sign-in" />

      <main className="account-content">
        <section className="account-card" aria-labelledby="account-title">
          <div className="account-card__intro">
            <p className="account-eyebrow">Welcome to GearBuddy</p>
            <h1 id="account-title">
              {isSignUp ? 'Create your account' : 'Sign in'}
            </h1>
            <p>
              {isSignUp
                ? 'Create an account to keep your repair plans in one place.'
                : 'Sign in to keep track of your bookings and repair plans.'}
            </p>
          </div>

          <form
            className="account-form"
            aria-label={isSignUp ? 'Create account' : 'Sign in'}
            onSubmit={handleSubmit}
          >
            {isSignUp && (
              <label className="account-field">
                <span>Full name</span>
                <input
                  autoComplete="name"
                  name="fullName"
                  type="text"
                  placeholder="Your name"
                  maxLength={100}
                  required
                />
              </label>
            )}

            <label className="account-field">
              <span>Email address</span>
              <input
                autoComplete="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                maxLength={254}
                required
              />
            </label>

            <label className="account-field">
              <span>Password</span>
              <input
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={
                  isSignUp ? 'At least 8 characters' : 'Enter your password'
                }
                minLength={8}
                required
              />
            </label>

            {isSignUp && (
              <label className="account-field">
                <span>Confirm password</span>
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password again"
                  minLength={8}
                  required
                />
              </label>
            )}

            <label className="show-password-option">
              <input
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                type="checkbox"
              />
              <span>Show password</span>
            </label>

            {!isSignUp && (
              <label className="remember-option">
                <input name="rememberMe" type="checkbox" />
                <span>Remember me</span>
              </label>
            )}

            <button
              className="button button--filled account-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Please wait…'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          {errorMessage && (
            <p className="account-notice" role="alert">
              {errorMessage}
            </p>
          )}

          {notice && (
            <p className="account-notice" role="status">
              {notice}
            </p>
          )}

          <p className="account-switch">
            {isSignUp ? 'Already have an account?' : 'New to GearBuddy?'}{' '}
            <a href={isSignUp ? '#sign-in' : '#sign-up'}>
              {isSignUp ? 'Sign in' : 'Create an account'}
            </a>
          </p>

          <a className="account-home-link" href="#home">
            Back to Home
          </a>
        </section>
      </main>
    </div>
  )
}

export default SignInPage