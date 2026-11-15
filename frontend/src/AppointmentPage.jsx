import { useState } from 'react'
import { getAuthToken } from './authStorage'
import './AppointmentPage.css'

const services = [
  'Brake service',
  'Oil change',
  'Tire service',
  'Vehicle inspection',
  'Battery service',
  'Vehicle diagnostics',
]

const appointmentTimes = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
]

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function getTodayLocalDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatTime(time) {
  const [hour, minute] = time.split(':').map(Number)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`
}

function AppointmentPage({ Header, initialDraft = {} }) {
  const [confirmation, setConfirmation] = useState(null)
  const [selectedService, setSelectedService] = useState(initialDraft.service || '')
  const [selectedShop, setSelectedShop] = useState(initialDraft.shop || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const today = getTodayLocalDate()

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    const token = getAuthToken()

    if (!token) {
      setErrorMessage('Please sign in before requesting an appointment.')
      return
    }

    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    const appointmentRequest = {
      service: formData.get('service'),
      shop: formData.get('shop'),
      date: formData.get('date'),
      time: formData.get('time'),
      vehicle: formData.get('vehicle').trim(),
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(appointmentRequest),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not save the request.')
      }

      setConfirmation(result.booking)
      window.sessionStorage.removeItem('gearbuddy-appointment-draft')
      form.reset()
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
    <div className="appointment-page">
      <Header activePage="appointments" />

      <main className="appointment-content">
        <div className="appointment-heading">
          <p className="appointment-eyebrow">Plan your next visit</p>
          <h1>Request an appointment</h1>
          <p>Choose a service, repair shop, and time that work for you.</p>
        </div>

        {confirmation ? (
          <section className="appointment-confirmation" role="status">
            <div className="appointment-confirmation__icon" aria-hidden="true">
              ✓
            </div>
            <h2>Your request was saved</h2>
            <p>
              You requested <strong>{confirmation.service}</strong> at{' '}
              <strong>{confirmation.shop}</strong>.
            </p>
            <dl className="appointment-summary">
              <div>
                <dt>Date</dt>
                <dd>{confirmation.date}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{formatTime(confirmation.time)}</dd>
              </div>
              <div>
                <dt>Vehicle</dt>
                <dd>{confirmation.vehicle}</dd>
              </div>
            </dl>
            <p className="appointment-demo-note">
              This request is saved in GearBuddy’s database with a pending
              status. The shop has not been notified, and its availability has
              not been checked.
            </p>
            <div className="appointment-confirmation__actions">
              <a className="button button--filled" href="#bookings">
                View My Bookings
              </a>
              <button
                className="button button--outline"
                type="button"
                onClick={() => setConfirmation(null)}
              >
                Make another request
              </button>
            </div>
          </section>
        ) : (
          <form
            className="appointment-form"
            aria-label="Request an appointment"
            onSubmit={handleSubmit}
          >
            <div className="appointment-form__grid">
              <label className="appointment-field">
                <span>Service</span>
                <select
                  name="service"
                  value={selectedService}
                  onChange={(event) => setSelectedService(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Choose a service
                  </option>
                  {selectedService && !services.includes(selectedService) && (
                    <option value={selectedService}>{selectedService}</option>
                  )}
                  {services.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>

              <label className="appointment-field">
                <span>Repair shop</span>
                <select
                  name="shop"
                  value={selectedShop}
                  onChange={(event) => setSelectedShop(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Choose a shop from Find Shops
                  </option>
                  {selectedShop && (
                    <option value={selectedShop}>{selectedShop}</option>
                  )}
                </select>
              </label>
              {!selectedShop && (
                <p className="appointment-form__note appointment-field--full">
                  Choose a live shop listing before requesting an appointment.{' '}
                  <a href="#shops">Find local repair shops</a>
                </p>
              )}
              <label className="appointment-field">
                <span>Preferred date</span>
                <input name="date" type="date" min={today} required />
              </label>

              <label className="appointment-field">
                <span>Preferred time</span>
                <select name="time" defaultValue="" required>
                  <option value="" disabled>
                    Choose a time
                  </option>
                  {appointmentTimes.map((time) => (
                    <option key={time.value} value={time.value}>
                      {time.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="appointment-field appointment-field--full">
                <span>Vehicle</span>
                <input
                  name="vehicle"
                  type="text"
                  placeholder="e.g. 2018 Honda Civic"
                  maxLength={80}
                  required
                />
              </label>
            </div>

            <p className="appointment-form__note">
              Submitting saves your request to GearBuddy’s database. It does
              not confirm the appointment with the shop.
            </p>

            {errorMessage && (
              <p className="booking-notice" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="button button--filled appointment-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving request…' : 'Submit request'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}

export default AppointmentPage