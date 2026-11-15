import { useEffect, useState } from 'react'
import { getAuthToken } from './authStorage'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function formatBookingDate(date) {
  if (!date) return 'Date not provided'

  const [year, month, day] = date.split('-').map(Number)
  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

  return `${monthName} ${day}, ${year}`
}

function formatBookingTime(time) {
  if (!time) return 'Time not provided'

  const [hour, minute] = time.split(':').map(Number)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`
}

function DatabaseMyBookingsPage({ Header }) {
  const [bookings, setBookings] = useState([])
  const [activeTab, setActiveTab] = useState('upcoming')
  const [editingBookingId, setEditingBookingId] = useState(null)
  const [updatingBookingId, setUpdatingBookingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadBookings() {
      setIsLoading(true)
      setErrorMessage('')

      const token = getAuthToken()

      if (!token) {
        setErrorMessage('Please sign in to view your bookings.')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message || 'Could not load bookings.')
        }

        if (isCurrent) {
          setBookings(
            (result.bookings ?? []).map((booking) => ({
              ...booking,
              id: booking._id || booking.id,
            })),
          )
        }
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(
            error.message ||
              'Could not connect to GearBuddy. Check that the backend is running.',
          )
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadBookings()

    return () => {
      isCurrent = false
    }
  }, [])

  async function saveBookingUpdate(bookingId, updates) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Please sign in to update your bookings.')
    }

    const response = await fetch(
      `${API_BASE_URL}/api/bookings/${bookingId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      },
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Could not update the booking.')
    }

    const updatedBooking = {
      ...result.booking,
      id: result.booking._id || result.booking.id,
    }

    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId ? updatedBooking : booking,
      ),
    )

    return updatedBooking
  }

  async function handleCancel(booking) {
    setUpdatingBookingId(booking.id)
    setErrorMessage('')
    setNotice('')

    try {
      await saveBookingUpdate(booking.id, { status: 'Cancelled' })
      setActiveTab('past')
      setEditingBookingId(null)
      setNotice(`${booking.service} at ${booking.shop} was cancelled.`)
    } catch (error) {
      setErrorMessage(error.message || 'Could not cancel this booking.')
    } finally {
      setUpdatingBookingId(null)
    }
  }

  async function handleReschedule(event, booking) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const date = formData.get('appointmentDate')
    const time = formData.get('appointmentTime')

    if (!date || !time) return

    setUpdatingBookingId(booking.id)
    setErrorMessage('')
    setNotice('')

    try {
      await saveBookingUpdate(booking.id, { date, time })
      setEditingBookingId(null)
      setNotice(`${booking.service} appointment updated.`)
    } catch (error) {
      setErrorMessage(error.message || 'Could not reschedule this booking.')
    } finally {
      setUpdatingBookingId(null)
    }
  }

  function handleBookAgain(booking) {
    setNotice(
      `${booking.service} is selected. You can request it again from the appointment page.`,
    )
  }

  const visibleBookings = bookings.filter((booking) => {
    if (activeTab === 'upcoming') {
      return booking.status === 'Confirmed' || booking.status === 'Pending'
    }

    return booking.status === 'Completed' || booking.status === 'Cancelled'
  })

  return (
    <div className="bookings-page" id="bookings">
      <Header activePage="bookings" />

      <main className="bookings-content">
        <h1 className="bookings-title">My bookings</h1>

        <div className="booking-tabs" role="tablist" aria-label="Booking history">
          <button
            className="button"
            type="button"
            role="tab"
            aria-selected={activeTab === 'upcoming'}
            onClick={() => {
              setActiveTab('upcoming')
              setNotice('')
              setErrorMessage('')
            }}
          >
            Upcoming
          </button>
          <button
            className="button"
            type="button"
            role="tab"
            aria-selected={activeTab === 'past'}
            onClick={() => {
              setActiveTab('past')
              setNotice('')
              setErrorMessage('')
            }}
          >
            Past
          </button>
        </div>

        {notice && (
          <p className="booking-notice" role="status">
            {notice}
          </p>
        )}

        {errorMessage && (
          <p className="booking-notice" role="alert">
            {errorMessage}
          </p>
        )}

        <section
          className="booking-list"
          aria-label={activeTab === 'upcoming' ? 'Upcoming bookings' : 'Past bookings'}
          aria-live="polite"
        >
          {isLoading ? (
            <p className="empty-bookings">Loading your bookings…</p>
          ) : visibleBookings.length > 0 ? (
            visibleBookings.map((booking) => (
              <article className="booking-card" key={booking.id}>
                <div className="booking-card__main">
                  <div className="booking-card__details">
                    <h2>{booking.service}</h2>
                    <p>
                      {booking.shop} <span aria-hidden="true">·</span>{' '}
                      {formatBookingDate(booking.date)} at{' '}
                      {formatBookingTime(booking.time)}{' '}
                      <span aria-hidden="true">·</span> {booking.vehicle}
                    </p>
                  </div>

                  <div className="booking-card__actions">
                    <span
                      className={`status-chip status-chip--${booking.status.toLowerCase()}`}
                    >
                      {booking.status}
                    </span>

                    {activeTab === 'upcoming' ? (
                      <>
                        <button
                          className="button button--outline"
                          type="button"
                          aria-label={`Reschedule ${booking.service}`}
                          disabled={updatingBookingId === booking.id}
                          onClick={() => {
                            setEditingBookingId(
                              editingBookingId === booking.id
                                ? null
                                : booking.id,
                            )
                            setErrorMessage('')
                            setNotice('')
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          className="button button--outline"
                          type="button"
                          aria-label={`Cancel ${booking.service}`}
                          disabled={updatingBookingId === booking.id}
                          onClick={() => handleCancel(booking)}
                        >
                          {updatingBookingId === booking.id
                            ? 'Saving…'
                            : 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <button
                        className="button button--outline"
                        type="button"
                        aria-label={`Book ${booking.service} again`}
                        onClick={() => handleBookAgain(booking)}
                      >
                        Book again
                      </button>
                    )}
                  </div>
                </div>

                {editingBookingId === booking.id && (
                  <form
                    className="reschedule-form"
                    aria-label={`Update appointment for ${booking.service}`}
                    onSubmit={(event) => handleReschedule(event, booking)}
                  >
                    <label>
                      New date
                      <input
                        type="date"
                        name="appointmentDate"
                        aria-label={`New date for ${booking.service}`}
                        defaultValue={booking.date}
                        required
                      />
                    </label>
                    <label>
                      New time
                      <input
                        type="time"
                        name="appointmentTime"
                        aria-label={`New time for ${booking.service}`}
                        defaultValue={booking.time}
                        required
                      />
                    </label>
                    <button
                      className="button button--filled"
                      type="submit"
                      disabled={updatingBookingId === booking.id}
                    >
                      {updatingBookingId === booking.id
                        ? 'Saving…'
                        : 'Save changes'}
                    </button>
                    <button
                      className="button button--outline"
                      type="button"
                      disabled={updatingBookingId === booking.id}
                      onClick={() => setEditingBookingId(null)}
                    >
                      Keep current time
                    </button>
                  </form>
                )}
              </article>
            ))
          ) : (
            <p className="empty-bookings">
              {activeTab === 'upcoming'
                ? 'You do not have any upcoming bookings.'
                : 'You do not have any past bookings yet.'}
            </p>
          )}
        </section>

        <p className="bookings-help">
          Past bookings stay here so you can review them.
        </p>
      </main>
    </div>
  )
}

export default DatabaseMyBookingsPage