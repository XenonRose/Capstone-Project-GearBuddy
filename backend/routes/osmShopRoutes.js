import express from 'express'

const router = express.Router()

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_URL = 'https://api.overpass.ch/v1/interpreter'
const APP_USER_AGENT = 'GearBuddyCapstone/1.0'
const CACHE_DURATION_MS = 10 * 60 * 1000
const NOMINATIM_REQUEST_GAP_MS = 1100
const OVERPASS_REQUEST_GAP_MS = 2000

const geocodeCache = new Map()
const shopSearchCache = new Map()

let lastNominatimRequestAt = 0
let lastOverpassRequestAt = 0
let nominatimQueue = Promise.resolve()
let overpassQueue = Promise.resolve()

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function geocodeLocation(location) {
  const cacheKey = location.trim().toLowerCase()
  const cachedResult = geocodeCache.get(cacheKey)

  if (cachedResult && cachedResult.expiresAt > Date.now()) {
    return cachedResult.coordinates
  }

  const requestUrl = new URL(NOMINATIM_URL)
  requestUrl.searchParams.set('format', 'jsonv2')
  requestUrl.searchParams.set('limit', '1')
  requestUrl.searchParams.set('q', location)

  const request = nominatimQueue.then(async () => {
    const elapsed = Date.now() - lastNominatimRequestAt
    const delay = Math.max(0, NOMINATIM_REQUEST_GAP_MS - elapsed)

    if (delay > 0) {
      await wait(delay)
    }

    lastNominatimRequestAt = Date.now()

    const response = await fetch(requestUrl, {
      headers: {
        'User-Agent': APP_USER_AGENT,
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`)
    }

    return response.json()
  })

  nominatimQueue = request.then(
    () => undefined,
    () => undefined,
  )

  const results = await request

  if (!results.length) {
    return null
  }

  const coordinates = {
    latitude: Number(results[0].lat),
    longitude: Number(results[0].lon),
    displayName: results[0].display_name,
  }

  geocodeCache.set(cacheKey, {
    coordinates,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  })

  return coordinates
}

function buildOverpassQuery(latitude, longitude, radiusMeters) {
  return `
[out:json][timeout:25];
(
  node["shop"="car_repair"](around:${radiusMeters},${latitude},${longitude});
  way["shop"="car_repair"](around:${radiusMeters},${latitude},${longitude});
  relation["shop"="car_repair"](around:${radiusMeters},${latitude},${longitude});
);
out center tags;
`
}

async function queryOverpass(query, cacheKey) {
  const cachedResult = shopSearchCache.get(cacheKey)

  if (cachedResult && cachedResult.expiresAt > Date.now()) {
    return cachedResult.elements
  }

  const apiKey = process.env.OVERPASS_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('OVERPASS_API_KEY_MISSING')
  }

  const request = overpassQueue.then(async () => {
    const elapsed = Date.now() - lastOverpassRequestAt
    const delay = Math.max(0, OVERPASS_REQUEST_GAP_MS - elapsed)

    if (delay > 0) {
      await wait(delay)
    }

    lastOverpassRequestAt = Date.now()

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': APP_USER_AGENT,
        'X-API-Key': apiKey,
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`)
    }

    return response.json()
  })

  overpassQueue = request.then(
    () => undefined,
    () => undefined,
  )

  const result = await request
  const elements = result.elements ?? []

  shopSearchCache.set(cacheKey, {
    elements,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  })

  return elements
}

function getElementCoordinates(element) {
  return {
    latitude: element.lat ?? element.center?.lat,
    longitude: element.lon ?? element.center?.lon,
  }
}

function getDistanceMiles(start, end) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371

  const latitudeDifference = toRadians(end.latitude - start.latitude)
  const longitudeDifference = toRadians(end.longitude - start.longitude)
  const startLatitude = toRadians(start.latitude)
  const endLatitude = toRadians(end.latitude)

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDifference / 2) ** 2

  const distanceKm =
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))

  return Math.round(distanceKm * 0.621371 * 10) / 10
}

function formatShopAddress(tags) {
  const street = [tags['addr:housenumber'], tags['addr:street']]
    .filter(Boolean)
    .join(' ')

  const city =
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || ''
  const state = tags['addr:state'] || ''
  const postalCode = tags['addr:postcode'] || ''

  return [street, city, state, postalCode].filter(Boolean).join(', ')
}

function formatShop(element, searchCenter) {
  const tags = element.tags ?? {}
  const coordinates = getElementCoordinates(element)

  if (
    typeof coordinates.latitude !== 'number' ||
    typeof coordinates.longitude !== 'number'
  ) {
    return null
  }

  const servicePrefix = 'service:vehicle:'
  const services = Object.entries(tags)
    .filter(
      ([key, value]) =>
        key.startsWith(servicePrefix) && value !== 'no',
    )
    .map(([key]) =>
      key.slice(servicePrefix.length).replaceAll('_', ' '),
    )

  return {
    id: `${element.type}-${element.id}`,
    osmType: element.type,
    osmId: element.id,
    name: tags.name || tags.brand || 'Auto repair shop',
    address:
      formatShopAddress(tags) || 'Address not listed in OpenStreetMap',
    phone: tags.phone || tags['contact:phone'] || '',
    website: tags.website || tags['contact:website'] || '',
    openingHours: tags.opening_hours || '',
    services,
    distanceMiles: getDistanceMiles(searchCenter, coordinates),
    coordinates,
    openStreetMapUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
  }
}

function getSafeDiagnosticCode(error) {
  if (error?.cause?.code) {
    return String(error.cause.code)
  }

  if (error?.message?.startsWith('HTTP_')) {
    return error.message
  }

  if (error?.message === 'OVERPASS_API_KEY_MISSING') {
    return error.message
  }

  return error?.name || 'UNKNOWN_ERROR'
}

router.get('/search', async (request, response) => {
  const location =
    typeof request.query.location === 'string'
      ? request.query.location.trim()
      : ''
  const radiusMiles = Number(request.query.radiusMiles ?? 10)

  if (!location) {
    return response.status(400).json({
      status: 'error',
      message: 'Enter a city or ZIP code to search.',
    })
  }

  if (!Number.isFinite(radiusMiles) || radiusMiles < 1 || radiusMiles > 25) {
    return response.status(400).json({
      status: 'error',
      message: 'Search radius must be between 1 and 25 miles.',
    })
  }

  if (!process.env.OVERPASS_API_KEY?.trim()) {
    return response.status(500).json({
      status: 'error',
      message: 'Shop search is not configured on the backend.',
    })
  }

  let failedStage = 'Nominatim location lookup'

  try {
    const searchCenter = await geocodeLocation(location)

    if (!searchCenter) {
      return response.status(404).json({
        status: 'error',
        message: 'We could not find that city or ZIP code.',
      })
    }

    const radiusMeters = Math.round(radiusMiles * 1609.34)
    const cacheKey = `${searchCenter.latitude.toFixed(4)},${searchCenter.longitude.toFixed(4)},${radiusMeters}`
    const query = buildOverpassQuery(
      searchCenter.latitude,
      searchCenter.longitude,
      radiusMeters,
    )

    failedStage = 'Overpass shop search'
    const elements = await queryOverpass(query, cacheKey)
    const shops = elements
      .map((element) => formatShop(element, searchCenter))
      .filter(Boolean)
      .sort((first, second) => first.distanceMiles - second.distanceMiles)

    return response.status(200).json({
      source: 'OpenStreetMap',
      attribution: '© OpenStreetMap contributors',
      attributionUrl: 'https://www.openstreetmap.org/copyright',
      searchedLocation: searchCenter.displayName,
      radiusMiles,
      count: shops.length,
      shops,
    })
  } catch (error) {
    const diagnosticCode = getSafeDiagnosticCode(error)

    console.error(
      `[OpenStreetMap diagnostic] ${failedStage}: ${diagnosticCode}`,
    )

    return response.status(502).json({
      status: 'error',
      message:
        'The OpenStreetMap search service could not be reached. Please try again later.',
      diagnostic: {
        stage: failedStage,
        code: diagnosticCode,
      },
    })
  }
})

export default router