import { fireEvent, render, screen } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import App from './App'

const API_BASE_URL = 'http://localhost:5000'
const AUTH_STORAGE_KEY = 'gearbuddy-auth'
const testSession = {
  token: 'test-token',
  user: {
    id: 'user-123',
    fullName: 'Test Driver',
    email: 'driver@example.com',
  },
}

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }
}

function createBookingFixtures() {
  return [
    {
      _id: 'booking-upcoming',
      service: 'Brake inspection',
      shop: 'Northside Auto Care',
      date: '2027-01-12',
      time: '10:30',
      vehicle: '2018 Honda Civic',
      status: 'Confirmed',
    },
    {
      _id: 'booking-past',
      service: 'Oil change',
      shop: 'Summit Automotive',
      date: '2026-10-12',
      time: '09:00',
      vehicle: '2018 Honda Civic',
      status: 'Completed',
    },
  ]
}

let bookingRecords
let shouldFailAiRequest

beforeEach(() => {
  window.location.hash = ''
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(testSession))
  bookingRecords = createBookingFixtures()
  shouldFailAiRequest = false

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options = {}) => {
      const method = options.method || 'GET'

      if (url === `${API_BASE_URL}/api/auth/signup`) {
        return jsonResponse(
          {
            message: 'Account created successfully.',
            ...testSession,
          },
          201,
        )
      }

      if (url === `${API_BASE_URL}/api/auth/signin`) {
        return jsonResponse({
          message: 'Signed in successfully.',
          ...testSession,
        })
      }

      if (url === API_BASE_URL + '/api/ai/troubleshoot' && method === 'POST') {
        if (shouldFailAiRequest) {
          return jsonResponse(
            {
              status: 'error',
              message: 'GearBuddy could not get an AI response. Please try again.',
              diagnostic: {
                stage: 'Gemini response generation',
                code: 'HTTP_503',
              },
            },
            502,
          )
        }

        const submittedProblem = JSON.parse(options.body).problem

        return jsonResponse({
          text: 'AI response for: ' + submittedProblem,
          services: [
            {
              name: 'Brake service',
              reason: 'A repair shop can inspect the braking system.',
            },
          ],
        })
      }
      if (
        url.startsWith(API_BASE_URL + '/api/shops/search?') &&
        method === 'GET'
      ) {
        const searchedLocation = new URL(url).searchParams.get('location')

        return jsonResponse({
          count: 2,
          searchedLocation,
          attributionUrl: 'https://www.openstreetmap.org/copyright',
          shops: [
            {
              id: 'northside',
              name: 'Northside Auto Care',
              address: '100 North Avenue, Denver, CO',
              distanceMiles: 2.1,
              services: ['Oil change'],
              phone: '303-555-0101',
              website: 'https://northside.example',
              openingHours: 'Mo-Fr 08:00-17:00',
              openStreetMapUrl: 'https://www.openstreetmap.org/node/1',
            },
            {
              id: 'cityline',
              name: 'Cityline Auto Service',
              address: '25 Cityline Street, Denver, CO',
              distanceMiles: 3.4,
              services: ['Brake service'],
              phone: '',
              website: '',
              openingHours: '',
              openStreetMapUrl: 'https://www.openstreetmap.org/node/2',
            },
          ],
        })
      }
      if (url === `${API_BASE_URL}/api/bookings` && method === 'GET') {
        return jsonResponse({
          count: bookingRecords.length,
          bookings: bookingRecords,
        })
      }

      if (url === `${API_BASE_URL}/api/bookings` && method === 'POST') {
        const submittedBooking = JSON.parse(options.body)
        const booking = {
          _id: 'booking-created',
          ...submittedBooking,
          status: 'Pending',
        }

        bookingRecords.unshift(booking)

        return jsonResponse(
          {
            message: 'Appointment request saved.',
            booking,
          },
          201,
        )
      }

      if (
        url.startsWith(`${API_BASE_URL}/api/bookings/`) &&
        method === 'PATCH'
      ) {
        const bookingId = url.split('/').at(-1)
        const booking = bookingRecords.find((item) => item._id === bookingId)

        if (!booking) {
          return jsonResponse(
            { message: 'Booking not found.' },
            404,
          )
        }

        Object.assign(booking, JSON.parse(options.body))

        return jsonResponse({
          message: 'Booking updated.',
          booking,
        })
      }

      return jsonResponse(
        { message: 'Unexpected test request.' },
        404,
      )
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GearBuddy screens', () => {
  it('shows the Home screen and its feature links', () => {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'GearBuddy' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '#sign-in',
    )
    expect(
      screen.getByRole('link', { name: 'Ask the GearBuddy' }),
    ).toHaveAttribute('href', '#ask')
  })

  it('shows the Ask GearBuddy page and shared header', () => {
    window.location.hash = '#ask'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Ask the GearBuddy' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Tell me what is going on with your car/),
    ).toBeInTheDocument()
  })

  it('sends a vehicle problem to the AI endpoint and shows returned service suggestions', async () => {
    window.location.hash = '#ask'
    render(<App />)

    fireEvent.change(screen.getByLabelText('Describe the problem'), {
      target: { value: 'My car shakes when I brake' },
    })
    fireEvent.submit(
      screen.getByRole('form', { name: 'Send a vehicle problem' }),
    )

    expect(
      screen.getByText('My car shakes when I brake'),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Brake service' }),
    ).toBeInTheDocument()

    expect(fetch).toHaveBeenCalledWith(
      API_BASE_URL + '/api/ai/troubleshoot',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ problem: 'My car shakes when I brake' }),
      },
    )
  })

  it('shows the backend diagnostic when the AI service is unavailable', async () => {
    window.location.hash = '#ask'
    shouldFailAiRequest = true
    render(<App />)

    fireEvent.change(screen.getByLabelText('Describe the problem'), {
      target: { value: 'My dashboard warning light is on' },
    })
    fireEvent.submit(
      screen.getByRole('form', { name: 'Send a vehicle problem' }),
    )

    expect(
      await screen.findByText(/Reference: HTTP_503/),
    ).toBeInTheDocument()
  })
  it('loads upcoming bookings from the API', async () => {
    window.location.hash = '#bookings'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'My bookings' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'Upcoming' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      await screen.findByRole('heading', { name: 'Brake inspection' }),
    ).toBeInTheDocument()

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/bookings`,
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      },
    )
  })

  it('shows past bookings and the Book again message', async () => {
    window.location.hash = '#bookings'
    render(<App />)

    fireEvent.click(screen.getByRole('tab', { name: 'Past' }))

    expect(
      await screen.findByRole('heading', { name: 'Oil change' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Book Oil change again' }),
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'You can request it again from the appointment page.',
    )
  })

  it('saves an appointment request with the signed-in token', async () => {
    window.location.hash = '#appointments'
    render(<App />)

    fireEvent.change(screen.getByLabelText('Service'), {
      target: { value: 'Brake service' },
    })
    fireEvent.change(screen.getByLabelText('Repair shop'), {
      target: { value: 'Northside Auto Care' },
    })
    fireEvent.change(screen.getByLabelText('Preferred date'), {
      target: { value: '2099-01-12' },
    })
    fireEvent.change(screen.getByLabelText('Preferred time'), {
      target: { value: '10:00' },
    })
    fireEvent.change(screen.getByLabelText('Vehicle'), {
      target: { value: '2018 Honda Civic' },
    })

    fireEvent.submit(
      screen.getByRole('form', { name: 'Request an appointment' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Your request was saved' }),
    ).toBeInTheDocument()

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/bookings`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      }),
    )
  })

  it('searches OpenStreetMap listings and shows repair shops', async () => {
    window.location.hash = '#shops'
    render(<App />)

    fireEvent.change(screen.getByLabelText('ZIP or city'), {
      target: { value: 'Denver' },
    })
    fireEvent.submit(screen.getByRole('form', { name: 'Search shops' }))

    expect(await screen.findByText('Northside Auto Care')).toBeInTheDocument()
    expect(screen.getByText('Cityline Auto Service')).toBeInTheDocument()
    expect(screen.getByLabelText('Map preview')).toBeInTheDocument()
  })

  it('filters returned shop listings by service type', async () => {
    window.location.hash = '#shops'
    render(<App />)

    fireEvent.change(screen.getByLabelText('ZIP or city'), {
      target: { value: '80203' },
    })
    fireEvent.change(screen.getByLabelText('Service type'), {
      target: { value: 'brakes' },
    })
    fireEvent.submit(screen.getByRole('form', { name: 'Search shops' }))

    expect(await screen.findByText('Cityline Auto Service')).toBeInTheDocument()
    expect(screen.queryByText('Northside Auto Care')).not.toBeInTheDocument()
    expect(screen.getByText(/1 shop found/)).toBeInTheDocument()
  })

  it('shows shop details and carries the selected shop to appointments', async () => {
    window.location.hash = '#shops'
    render(<App />)

    fireEvent.change(screen.getByLabelText('ZIP or city'), {
      target: { value: 'Denver' },
    })
    fireEvent.submit(screen.getByRole('form', { name: 'Search shops' }))

    fireEvent.click(
      await screen.findByRole('button', { name: 'Details for Northside Auto Care' }),
    )
    expect(screen.getAllByText('100 North Avenue, Denver, CO')).toHaveLength(2)
    expect(screen.getByText('303-555-0101')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Book at Northside Auto Care' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Request an appointment' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Repair shop')).toHaveValue('Northside Auto Care')
  })
  it('shows service information and a link to search for a local shop', () => {
    window.location.hash = '#service-details/Brake%20service'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Brake service' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Find a local shop')).toBeInTheDocument()
    expect(
      screen.getByText('Examples of what a shop may check'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Find shops for this service' }),
    ).toHaveAttribute('href', '#shops')
  })
})

describe('GearBuddy account forms', () => {
  it('creates an account and saves the returned session for this browser tab', async () => {
    window.location.hash = '#sign-up'
    render(<App />)

    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Test Driver' },
    })
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'driver@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'test-password-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'test-password-123' },
    })

    fireEvent.submit(screen.getByRole('form', { name: 'Create account' }))

    expect(
      await screen.findByRole('status'),
    ).toHaveTextContent('Your account was created and you are signed in.')

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/auth/signup`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(
      JSON.parse(window.sessionStorage.getItem(AUTH_STORAGE_KEY)),
    ).toEqual(testSession)
  })

  it('signs in and stores a remembered session in local storage', async () => {
    window.location.hash = '#sign-in'
    render(<App />)

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'driver@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'test-password-123' },
    })
    fireEvent.click(screen.getByLabelText('Remember me'))

    fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))

    expect(
      await screen.findByRole('status'),
    ).toHaveTextContent('You are signed in successfully.')

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/auth/signin`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(
      JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY)),
    ).toEqual(testSession)
    expect(
      window.sessionStorage.getItem(AUTH_STORAGE_KEY),
    ).toBeNull()
  })
})




