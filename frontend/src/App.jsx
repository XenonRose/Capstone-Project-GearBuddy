import { useEffect, useState } from 'react'
import './App.css'
import SignInPage from './SignInPage'
import AppointmentPage from './AppointmentPage'
import { getSavedBookings, saveBookings } from './bookingStorage'
import DatabaseMyBookingsPage from './DatabaseMyBookingsPage'
import { getAuthSession } from './authStorage'
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const APPOINTMENT_DRAFT_STORAGE_KEY = 'gearbuddy-appointment-draft'

const serviceLabelsByFilter = {
  oil: 'Oil change',
  brakes: 'Brake service',
  tires: 'Tire service',
  inspection: 'Vehicle inspection',
}

function readAppointmentDraft() {
  try {
    const savedDraft = window.sessionStorage.getItem(
      APPOINTMENT_DRAFT_STORAGE_KEY,
    )
    const draft = savedDraft ? JSON.parse(savedDraft) : {}

    return {
      service: typeof draft.service === 'string' ? draft.service : '',
      shop: typeof draft.shop === 'string' ? draft.shop : '',
    }
  } catch {
    window.sessionStorage.removeItem(APPOINTMENT_DRAFT_STORAGE_KEY)
    return { service: '', shop: '' }
  }
}

function saveAppointmentDraft(updates) {
  const currentDraft = readAppointmentDraft()
  const nextDraft = { ...currentDraft, ...updates }

  window.sessionStorage.setItem(
    APPOINTMENT_DRAFT_STORAGE_KEY,
    JSON.stringify(nextDraft),
  )
}

function getServiceFilterFromDraft() {
  const service = readAppointmentDraft().service.toLowerCase()

  if (service.includes('oil')) return 'oil'
  if (service.includes('brake')) return 'brakes'
  if (service.includes('tire')) return 'tires'
  if (service.includes('inspection')) return 'inspection'

  return 'any'
}

function GearBuddyLogo({ className = '' }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      viewBox="-50 0 240 250"
      role="img"
      aria-label="GearBuddy gear logo"
    >
      <g fill="currentColor">
        {Array.from({ length: 8 }, (_, index) => (
          <rect
            key={index}
            x="86"
            y="14"
            width="28"
            height="34"
            rx="7"
            transform={`rotate(${index * 45} 100 100)`}
          />
        ))}
        <circle cx="100" cy="100" r="66" />
      </g>
      <circle cx="100" cy="100" r="48" fill="var(--orange)" />
      <circle cx="84" cy="90" r="7" fill="#fff" />
      <circle cx="116" cy="90" r="7" fill="#fff" />
      <path
        d="M78 112 Q100 134 122 112"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <g transform="translate(11.6 188.4)" fill="var(--orange)">
        {Array.from({ length: 5 }, (_, index) => (
          <rect
            key={index}
            x="-14"
            y="-58"
            width="28"
            height="34"
            rx="7"
            transform={`rotate(${index * 72})`}
          />
        ))}
        <circle r="38" />
        <circle r="13" fill="var(--navy)" />
      </g>
    </svg>
  )
}

function WheelDecoration({ className = '' }) {
  return (
    <svg
      className={`wheel-decoration ${className}`}
      viewBox="0 0 220 220"
      aria-hidden="true"
    >
      <circle
        cx="110"
        cy="110"
        r="88"
        fill="none"
        stroke="currentColor"
        strokeDasharray="24 22.08"
        strokeWidth="28"
      />
      <circle cx="110" cy="110" r="84" fill="currentColor" />
      <circle cx="110" cy="110" r="30" fill="var(--page-bg)" />
    </svg>
  )
}

function BackgroundWrench({ maskId, className = '' }) {
  return (
    <svg
      className={`background-wrench ${className}`}
      viewBox="0 0 100 300"
      aria-hidden="true"
    >
      <mask id={maskId}>
        <rect x="-10" y="-10" width="120" height="320" fill="#fff" />
        <rect x="36" y="-10" width="28" height="50" fill="#000" />
        <rect x="36" y="260" width="28" height="50" fill="#000" />
      </mask>
      <g mask={`url(#${maskId})`} fill="var(--wheel-bg)">
        <circle cx="50" cy="40" r="34" />
        <circle cx="50" cy="260" r="34" />
        <rect x="41" y="60" width="18" height="180" rx="9" />
      </g>
    </svg>
  )
}

function BackgroundArt() {
  return (
    <div className="background-art" aria-hidden="true">
      <WheelDecoration className="background-gear background-gear--top-left" />
      <WheelDecoration className="background-gear background-gear--bottom-right" />
      <WheelDecoration className="background-gear background-gear--bottom-left" />
      <WheelDecoration className="background-gear background-gear--top-right" />

      <BackgroundWrench
        maskId="background-wrench-mask-one"
        className="background-wrench--left"
      />
      <BackgroundWrench
        maskId="background-wrench-mask-two"
        className="background-wrench--bottom"
      />
      <BackgroundWrench
        maskId="background-wrench-mask-three"
        className="background-wrench--top-center"
      />
    </div>
  )
}

export function SiteHeader({ activePage }) {
  const session = getAuthSession()

  function handleSignOut() {
    window.localStorage.removeItem('gearbuddy-auth')
    window.sessionStorage.removeItem('gearbuddy-auth')
    window.location.hash = '#home'
    window.location.reload()
  }

  return (
    <header className="site-header">
      <a className="site-brand" href="#home" aria-label="GearBuddy home">
        <GearBuddyLogo className="brand-mark--header" />
        <span className="site-brand__name">
          Gear<span>Buddy</span>
        </span>
      </a>

      <nav className="site-nav" aria-label="Main navigation">
        <a href="#home" aria-current={activePage === 'home' ? 'page' : undefined}>
          Home
        </a>
        <a href="#ask" aria-current={activePage === 'ask' ? 'page' : undefined}>
          Ask GearBuddy
        </a>
        <a href="#shops" aria-current={activePage === 'shops' ? 'page' : undefined}>
          Find Shops
        </a>
        <a
          href="#bookings"
          aria-current={activePage === 'bookings' ? 'page' : undefined}
        >
          My Bookings
        </a>
      </nav>

      <div className="account-actions">
        {session ? (
          <>
            <span aria-label="Signed-in account">
              {session.user?.fullName || session.user?.email || 'Signed in'}
            </span>
            <button
              className="button button--outline"
              type="button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <a className="button button--outline" href="#sign-in">
              Log in
            </a>
            <a className="button button--filled" href="#sign-up">
              Sign up
            </a>
          </>
        )}
      </div>
    </header>
  )
}

function FeatureIcon({ type }) {
  const shared = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (type === 'chat') {
    return (
      <svg {...shared}>
        <path d="M4 5h16v11H9l-5 4z" />
      </svg>
    )
  }

  if (type === 'search') {
    return (
      <svg {...shared}>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 5 5" />
      </svg>
    )
  }

  return (
    <svg {...shared}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  )
}

const features = [
  { title: 'Ask the GearBuddy', href: '#ask', icon: 'chat', tone: 'navy' },
  { title: 'Search for shops', href: '#shops', icon: 'search', tone: 'light' },
  {
    title: 'Book an appointment',
    href: '#appointments',
    icon: 'calendar',
    tone: 'orange',
  },
]

function FeatureCard({ title, href, icon, tone }) {
  return (
    <a className={`feature-card feature-card--${tone}`} href={href}>
      <WheelDecoration className="feature-card__wheel" />
      <FeatureIcon type={icon} />
      <span>{title}</span>
    </a>
  )
}

function HomePage() {
  return (
    <div className="home-page" id="home">
      <BackgroundArt />
      <SiteHeader activePage="home" />

      <main className="home-content" aria-label="GearBuddy home">
        <div className="brand-lockup">
          <GearBuddyLogo />
          <h1>
            Gear<span>Buddy</span>
          </h1>
        </div>

        <nav className="feature-grid" aria-label="Main features">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </nav>
      </main>
    </div>
  )
}

function AskGearBuddyPage() {
  const [problem, setProblem] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      text: 'Hi! Tell me what is going on with your car and I will suggest services you can ask a shop about.',
    },
  ])

  async function handleSubmit(event) {
    event.preventDefault()

    const description = problem.trim()
    if (!description || isSending) return

    setConversation((currentConversation) => [
      ...currentConversation,
      { role: 'user', text: description },
    ])
    setProblem('')
    setIsSending(true)

    try {
      const apiResponse = await fetch(
        API_BASE_URL + '/api/ai/troubleshoot',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ problem: description }),
        },
      )

      let result = {}
      try {
        result = await apiResponse.json()
      } catch {
        result = {}
      }

      if (!apiResponse.ok) {
        const errorMessage =
          typeof result.message === 'string'
            ? result.message
            : 'GearBuddy could not get an AI response. Please try again.'
        const diagnosticCode = result.diagnostic && result.diagnostic.code
        throw new Error(
          diagnosticCode
            ? errorMessage + ' (Reference: ' + diagnosticCode + ')'
            : errorMessage,
        )
      }

      if (typeof result.text !== 'string' || !result.text.trim()) {
        throw new Error('GearBuddy received an empty AI response. Please try again.')
      }

      setConversation((currentConversation) => [
        ...currentConversation,
        {
          role: 'assistant',
          text: result.text.trim(),
          services: Array.isArray(result.services) ? result.services : [],
        },
      ])
    } catch (error) {
      setConversation((currentConversation) => [
        ...currentConversation,
        {
          role: 'assistant',
          text:
            error instanceof Error
              ? error.message
              : 'GearBuddy could not get an AI response. Please try again.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="ask-page" id="ask">
      <BackgroundArt />
      <SiteHeader activePage="ask" />

      <main className="ask-content">
        <div className="ask-intro">
          <h1 className="ask-title">Ask the GearBuddy</h1>
          <p className="ask-subtitle">
            Describe what is going on with your car and get service suggestions.
          </p>
        </div>

        <section className="chat-panel" aria-label="GearBuddy troubleshooting chat">
          <div
            className="chat-log"
            role="log"
            aria-live="polite"
            aria-busy={isSending}
          >
            {conversation.map((message, index) => (
              <div
                className={'chat-entry chat-entry--' + message.role}
                key={message.role + '-' + index}
              >
                <div className={'chat-bubble chat-bubble--' + message.role}>
                  {message.text}
                </div>

                {message.services && message.services.length > 0 && (
                  <div className="service-suggestions">
                    {message.services.map((service) => (
                      <article className="service-card" key={service.name}>
                        <h2>{service.name}</h2>
                        <p>{service.reason}</p>
                        <a
                          className="service-detail-link"
                          href={'#service-details/' + encodeURIComponent(service.name)}
                        >
                          View service details
                        </a>
                        <button
                          className="button button--filled service-button"
                          type="button"
                          onClick={() => {
                            saveAppointmentDraft({ service: service.name, shop: '' })
                            window.location.hash = '#shops'
                          }}
                        >
                          Book this
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <p className="ai-loading-message" role="status">
                GearBuddy is checking your symptoms...
              </p>
            )}
          </div>

          <p className="guidance-note">
            General guidance only, not a diagnosis. Have a professional inspect
            anything unclear or safety related.
          </p>

          <form
            className="message-form"
            aria-label="Send a vehicle problem"
            onSubmit={handleSubmit}
          >
            <div className="message-field">
              <label htmlFor="vehicle-problem">Describe the problem</label>
              <input
                id="vehicle-problem"
                name="vehicleProblem"
                type="text"
                value={problem}
                onChange={(event) => setProblem(event.target.value)}
                placeholder="e.g. my car shakes when I brake"
                maxLength={400}
                required
                disabled={isSending}
              />
            </div>
            <button
              className="button button--filled send-button"
              type="submit"
              disabled={isSending}
            >
              {isSending ? 'Checking...' : 'Send'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
const initialBookings = [
  {
    id: 'booking-1',
    service: 'Brake inspection',
    shop: 'Northside Auto Care',
    date: '2026-11-12',
    time: '10:30',
    vehicle: '2018 Honda Civic',
    status: 'Confirmed',
  },
  {
    id: 'booking-2',
    service: 'Battery and charging test',
    shop: 'Cityline Auto Service',
    date: '2026-11-16',
    time: '13:00',
    vehicle: '2021 Toyota Corolla',
    status: 'Pending',
  },
  {
    id: 'booking-3',
    service: 'Oil change',
    shop: 'Summit Automotive',
    date: '2026-10-12',
    time: '09:00',
    vehicle: '2018 Honda Civic',
    status: 'Completed',
  },
]

function formatBookingDate(date) {
  const [year, month, day] = date.split('-').map(Number)
  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

  return `${monthName} ${day}, ${year}`
}

function formatBookingTime(time) {
  const [hour, minute] = time.split(':').map(Number)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`
}

function MyBookingsPage() {
  const [bookings, setBookings] = useState(() => [
    ...initialBookings,
    ...getSavedBookings(),
  ])
  const [activeTab, setActiveTab] = useState('upcoming')
  const [editingBookingId, setEditingBookingId] = useState(null)
  const [notice, setNotice] = useState('')

  function updateBookings(update) {
    setBookings((currentBookings) => {
      const nextBookings = update(currentBookings)
      saveBookings(nextBookings)
      return nextBookings
    })
  }

  const visibleBookings = bookings.filter((booking) => {
    if (activeTab === 'upcoming') {
      return booking.status === 'Confirmed' || booking.status === 'Pending'
    }

    return booking.status === 'Completed' || booking.status === 'Cancelled'
  })

  function handleCancel(booking) {
    updateBookings((currentBookings) =>
      currentBookings.map((currentBooking) =>
        currentBooking.id === booking.id
          ? { ...currentBooking, status: 'Cancelled' }
          : currentBooking,
      ),
    )
    setActiveTab('past')
    setEditingBookingId(null)
    setNotice(`${booking.service} at ${booking.shop} was cancelled.`)
  }

  function handleReschedule(event, booking) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const date = formData.get('appointmentDate')
    const time = formData.get('appointmentTime')

    if (!date || !time) return

    updateBookings((currentBookings) =>
      currentBookings.map((currentBooking) =>
        currentBooking.id === booking.id
          ? { ...currentBooking, date, time }
          : currentBooking,
      ),
    )
    setEditingBookingId(null)
    setNotice(`${booking.service} appointment updated.`)
  }

  function handleBookAgain(booking) {
    setNotice(
      `${booking.service} is selected. The appointment scheduling page will be connected in a later step.`,
    )
  }

  return (
    <div className="bookings-page" id="bookings">
      <BackgroundArt />
      <SiteHeader activePage="bookings" />

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

        <section
          className="booking-list"
          aria-label={activeTab === 'upcoming' ? 'Upcoming bookings' : 'Past bookings'}
        >
          {visibleBookings.length > 0 ? (
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
                          onClick={() => setEditingBookingId(booking.id)}
                        >
                          Reschedule
                        </button>
                        <button
                          className="button button--outline"
                          type="button"
                          aria-label={`Cancel ${booking.service}`}
                          onClick={() => handleCancel(booking)}
                        >
                          Cancel
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
                    <button className="button button--filled" type="submit">
                      Save changes
                    </button>
                    <button
                      className="button button--outline"
                      type="button"
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
          Past bookings stay here so you can review them or book the same service
          again.
        </p>
      </main>
    </div>
  )
}

const serviceSearchTerms = {
  oil: 'oil change',
  brakes: 'brake',
  tires: 'tire',
  inspection: 'inspection',
}

function SearchForShopsPage() {
  const [locationInput, setLocationInput] = useState('')
  const [serviceInput, setServiceInput] = useState(getServiceFilterFromDraft)
  const [distanceInput, setDistanceInput] = useState('10')
  const [shops, setShops] = useState([])
  const [searched, setSearched] = useState(false)
  const [searchedLocation, setSearchedLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [expandedShopId, setExpandedShopId] = useState(null)
  const [notice, setNotice] = useState('')
  const [attributionUrl, setAttributionUrl] = useState('')

  const serviceTerm = serviceSearchTerms[serviceInput]
  const filteredShops = shops.filter((shop) => {
    if (!serviceTerm) return true

    return (shop.services ?? []).some((service) =>
      service.toLowerCase().includes(serviceTerm),
    )
  })

  async function handleSearch(event) {
    event.preventDefault()
    setErrorMessage('')
    setNotice('')
    setExpandedShopId(null)

    const location = locationInput.trim()

    if (!location) {
      setShops([])
      setSearched(false)
      setErrorMessage('Enter a city or ZIP code to search.')
      return
    }

    setIsLoading(true)
    setSearched(true)

    try {
      const query = new URLSearchParams({
        location,
        radiusMiles: distanceInput,
      })
      const response = await fetch(
        `${API_BASE_URL}/api/shops/search?${query.toString()}`,
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not search for repair shops.')
      }

      setShops(result.shops ?? [])
      setSearchedLocation(result.searchedLocation || location)
      setAttributionUrl(result.attributionUrl || '')
    } catch (error) {
      setShops([])
      setSearchedLocation('')
      setAttributionUrl('')
      setErrorMessage(
        error.message ||
          'Could not connect to GearBuddy. Check that the backend is running and try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleBook(shop) {
    const savedDraft = readAppointmentDraft()
    const selectedService =
      savedDraft.service || serviceLabelsByFilter[serviceInput] || ''

    saveAppointmentDraft({ service: selectedService, shop: shop.name })
    window.location.hash = '#appointments'
  }

  return (
    <div className="shops-page" id="shops">
      <BackgroundArt />
      <SiteHeader activePage="shops" />

      <main className="shops-content">
        <h1 className="shops-title">Search for shops</h1>

        <form
          className="shop-search-form"
          aria-label="Search shops"
          onSubmit={handleSearch}
        >
          <div className="shop-search-field shop-search-field--location">
            <label htmlFor="shop-location">ZIP or city</label>
            <input
              id="shop-location"
              type="search"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              placeholder="ZIP or city"
              required
            />
          </div>

          <div className="shop-search-field shop-search-field--service">
            <label htmlFor="shop-service">Service type</label>
            <select
              id="shop-service"
              value={serviceInput}
              onChange={(event) => setServiceInput(event.target.value)}
            >
              <option value="any">Any service</option>
              <option value="oil">Oil change</option>
              <option value="brakes">Brakes</option>
              <option value="tires">Tires</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>

          <div className="shop-search-field shop-search-field--distance">
            <label htmlFor="shop-distance">Distance</label>
            <select
              id="shop-distance"
              value={distanceInput}
              onChange={(event) => setDistanceInput(event.target.value)}
            >
              <option value="10">Within 10 miles</option>
              <option value="25">Within 25 miles</option>
            </select>
          </div>

          <button
            className="button button--filled shop-search-button"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {notice && (
          <p className="booking-notice" role="status">
            {notice}
          </p>
        )}

        {errorMessage && (
          <p className="no-shops" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="shop-layout">
          <section className="shop-results" aria-label="Shop search results">
            {isLoading && (
              <p className="results-summary" role="status">
                Searching OpenStreetMap for nearby repair shops…
              </p>
            )}

            {!isLoading && searched && !errorMessage && (
              <>
                <p className="results-summary" aria-live="polite">
                  {filteredShops.length}{' '}
                  {filteredShops.length === 1 ? 'shop' : 'shops'} found
                  {searchedLocation ? ` near ${searchedLocation}` : ''}
                </p>

                {filteredShops.length > 0 ? (
                  filteredShops.map((shop) => (
                    <article className="shop-card" key={shop.id}>
                      <div className="shop-card__main">
                        <div className="shop-card__information">
                          <h2>{shop.name}</h2>
                          <p className="shop-card__meta">
                            <span>
                              {typeof shop.distanceMiles === 'number'
                                ? `${shop.distanceMiles} miles away`
                                : 'Distance not available'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{shop.address}</span>
                          </p>

                          {shop.services?.length > 0 ? (
                            <div
                              className="shop-service-tags"
                              aria-label="Services listed in OpenStreetMap"
                            >
                              {shop.services.map((service) => (
                                <a
                                  className="shop-service-tag"
                                  key={service}
                                  href={`#service-details/${encodeURIComponent(service)}`}
                                >
                                  {service}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="shop-card__meta">
                              Services are not listed in OpenStreetMap.
                            </p>
                          )}
                        </div>

                        <div className="shop-card__actions">
                          <button
                            className="button button--filled"
                            type="button"
                            aria-label={`Book at ${shop.name}`}
                            onClick={() => handleBook(shop)}
                          >
                            Book
                          </button>
                          <button
                            className="button button--outline"
                            type="button"
                            aria-label={`Details for ${shop.name}`}
                            aria-expanded={expandedShopId === shop.id}
                            onClick={() =>
                              setExpandedShopId(
                                expandedShopId === shop.id ? null : shop.id,
                              )
                            }
                          >
                            {expandedShopId === shop.id
                              ? 'Hide details'
                              : 'Details'}
                          </button>
                        </div>
                      </div>

                      {expandedShopId === shop.id && (
                        <div className="shop-extra-details">
                          <p>
                            <strong>Address:</strong> {shop.address}
                          </p>
                          {shop.phone ? (
                            <p>
                              <strong>Phone:</strong> {shop.phone}
                            </p>
                          ) : (
                            <p>Phone number is not listed in OpenStreetMap.</p>
                          )}
                          {shop.website && (
                            <p>
                              <strong>Website:</strong>{' '}
                              <a
                                href={shop.website}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Visit shop website
                              </a>
                            </p>
                          )}
                          {shop.openingHours && (
                            <p>
                              <strong>Hours:</strong> {shop.openingHours}
                            </p>
                          )}
                          {shop.openStreetMapUrl && (
                            <p>
                              <a
                                href={shop.openStreetMapUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View this listing on OpenStreetMap
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="no-shops">
                    {shops.length === 0
                      ? 'No auto repair shops were found in that area. Try a nearby city or a larger search radius.'
                      : 'No shops in these results list that service. Try another service or choose Any service.'}
                  </p>
                )}
              </>
            )}

            {!isLoading && !searched && !errorMessage && (
              <p className="empty-bookings">
                Enter a city or ZIP code to find nearby auto repair shops.
              </p>
            )}

            {attributionUrl && !errorMessage && (
              <p className="bookings-help">
                Shop listing data © OpenStreetMap contributors.{' '}
                <a href={attributionUrl} target="_blank" rel="noreferrer">
                  OpenStreetMap copyright and attribution
                </a>
              </p>
            )}
          </section>

          <aside className="map-panel" aria-label="Map preview">
            <div className="map-panel__roads" aria-hidden="true">
              <span className="map-road map-road--one" />
              <span className="map-road map-road--two" />
              <span className="map-road map-road--three" />
              <span className="map-pin">●</span>
            </div>
            <div className="map-panel__label">Map preview</div>
            <p>
              {isLoading
                ? 'Searching for nearby locations.'
                : `${filteredShops.length} OpenStreetMap ${filteredShops.length === 1 ? 'location' : 'locations'} shown.`}
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}
const serviceDetailsCatalog = [
  {
    match: 'brake',
    name: 'Brake service',
    description:
      'A brake service checks key braking parts and helps identify wear or issues that may affect stopping.',
    includes: [
      'Visual inspection of brake pads and rotors',
      'Brake fluid level and condition check',
      'Written estimate for recommended repairs',
    ],
  },
  {
    match: 'oil',
    name: 'Oil change',
    description:
      'An oil change replaces used engine oil and checks related items that support routine engine maintenance.',
    includes: [
      'Drain and replace engine oil',
      'Install a new oil filter',
      'Check fluid levels and maintenance reminder',
    ],
  },
  {
    match: 'tire',
    name: 'Tire service',
    description:
      'Tire service can include inspection, rotation, balancing, or help identifying uneven wear.',
    includes: [
      'Inspect tread and tire condition',
      'Check tire pressure',
      'Review rotation or balancing needs',
    ],
  },
  {
    match: 'inspection',
    name: 'Vehicle inspection',
    description:
      'A general vehicle inspection reviews common systems and can help identify maintenance needs.',
    includes: [
      'Visual inspection of common vehicle systems',
      'Review of warning lights and reported symptoms',
      'Summary of recommended next steps',
    ],
  },
  {
    match: 'battery',
    name: 'Battery service',
    description:
      'Battery service checks the battery and charging system when a vehicle has trouble starting or staying powered.',
    includes: [
      'Battery condition test',
      'Charging system check',
      'Replacement estimate if needed',
    ],
  },
  {
    match: 'diagnostic',
    name: 'Vehicle diagnostics',
    description:
      'A diagnostic visit helps a mechanic investigate warning lights or symptoms and recommend a repair plan.',
    includes: [
      'Review of reported symptoms',
      'Diagnostic scan when appropriate',
      'Written findings and repair estimate',
    ],
  },
]

function getServiceDetailsFromHash() {
  const prefix = '#service-details/'
  const requestedName = window.location.hash.startsWith(prefix)
    ? decodeURIComponent(window.location.hash.slice(prefix.length)).toLowerCase()
    : 'brake'

  return (
    serviceDetailsCatalog.find((service) =>
      requestedName.includes(service.match),
    ) ?? serviceDetailsCatalog[0]
  )
}

function ServiceDetailsPage() {
  const service = getServiceDetailsFromHash()

  return (
    <div className="service-details-page" id="service-details">
      <BackgroundArt />
      <SiteHeader activePage="service-details" />

      <main className="service-details-content">
        <p className="service-breadcrumb">
          <a href="#shops">Find Shops</a>
          <span aria-hidden="true">/</span>
          <span>{service.name}</span>
        </p>

        <div className="service-details-layout">
          <section className="service-overview">
            <div className="service-image-placeholder">Service image</div>

            <h1 className="service-details-title">{service.name}</h1>

            <div className="service-facts">
              <span className="status-chip">General information</span>
              <span className="status-chip">Price and timing vary</span>
            </div>

            <p className="service-description">{service.description}</p>

            <p className="service-help">
              This is general service information, not a diagnosis or a shop quote.
              Ask a repair shop to inspect your vehicle and confirm its services,
              price, and appointment availability.
            </p>

            <section className="service-includes">
              <h2>Examples of what a shop may check</h2>
              {service.includes.map((item) => (
                <div className="service-include-row" key={item}>
                  <span>{item}</span>
                </div>
              ))}
            </section>

            <p className="service-help">
              Not sure what to ask? <a href="#ask">Ask the GearBuddy</a>
            </p>
          </section>

          <aside className="shops-offering-panel">
            <h2>Find a local shop</h2>
            <p>
              Search current OpenStreetMap listings near your city or ZIP code.
              Listing details may be incomplete or out of date, so contact the
              shop to confirm information before visiting.
            </p>
            <a
              className="button button--filled"
              href="#shops"
              onClick={() =>
                saveAppointmentDraft({ service: service.name, shop: '' })
              }
            >
              Find shops for this service
            </a>
            <p className="bookings-help">
              Listing data © OpenStreetMap contributors.{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                Attribution and license information
              </a>
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}
function getCurrentPage() {
  const { hash } = window.location

  if (hash === '#ask') return 'ask'
  if (hash === '#bookings') return 'bookings'
  if (hash === '#shops') return 'shops'
  if (hash.startsWith('#service-details')) return 'service-details'
  if (hash === '#sign-in' || hash === '#sign-up') return 'sign-in'
  if (hash === '#appointments') return 'appointments'
  return 'home'
}

function App() {
  const [currentPage, setCurrentPage] = useState(getCurrentPage)

  useEffect(() => {
    function handleHashChange() {
      setCurrentPage(getCurrentPage())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (currentPage === 'ask') return <AskGearBuddyPage />
  if (currentPage === 'bookings') {
    return <DatabaseMyBookingsPage Header={SiteHeader} />
  }
  if (currentPage === 'shops') return <SearchForShopsPage />
  if (currentPage === 'service-details') {
    return <ServiceDetailsPage key={window.location.hash} />
  }
  if (currentPage === 'sign-in') {
    return (
      <SignInPage
        key={window.location.hash}
        Header={SiteHeader}
      />
    )
  }
  if (currentPage === 'appointments') {
    return <AppointmentPage Header={SiteHeader} initialDraft={readAppointmentDraft()} />
  }
  return <HomePage />
}

export default App
