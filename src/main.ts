import './style.css'
import { searchCities, getWeather } from './api'
import { getWeatherInfo } from './weatherCodes'
import { icon } from './icons'
import type { City, Weather } from './types'

const form = document.querySelector<HTMLFormElement>('#search-form')!
const input = document.querySelector<HTMLInputElement>('#city')!
const suggestionsEl = document.querySelector<HTMLUListElement>('#suggestions')!
const searchError = document.querySelector<HTMLParagraphElement>('#search-error')!
const locationBtn = document.querySelector<HTMLButtonElement>('#location-btn')!
const weatherEl = document.querySelector<HTMLElement>('#weather')!

const LAST_CITY_KEY = 'last-city'

let debounceTimer: number | undefined
let suggestions: City[] = []

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function cityLabel(city: City): string {
  return [city.name, city.admin1, city.country].filter(Boolean).join(', ')
}

function showSearchError(message: string) {
  searchError.textContent = message
  input.classList.add('invalid')
}

function clearSearchError() {
  searchError.textContent = ''
  input.classList.remove('invalid')
}

function validateQuery(query: string): string | null {
  if (query === '') return 'Enter a city name'
  if (query.length < 2) return 'City name is too short'
  if (/[0-9]/.test(query)) return 'City name should not contain numbers'
  return null
}

/* ---------- suggestions ---------- */

function hideSuggestions() {
  suggestionsEl.hidden = true
  suggestionsEl.innerHTML = ''
}

function renderSuggestions(cities: City[]) {
  if (cities.length === 0) {
    suggestionsEl.innerHTML = '<li class="no-results">No cities found</li>'
    suggestionsEl.hidden = false
    return
  }

  suggestionsEl.innerHTML = cities
    .map(
      (city, index) => `
        <li>
          <button type="button" data-index="${index}">${escapeHtml(cityLabel(city))}</button>
        </li>
      `,
    )
    .join('')
  suggestionsEl.hidden = false
}

async function loadSuggestions(query: string) {
  try {
    const cities = await searchCities(query)
    // input could change while we were waiting
    if (input.value.trim() !== query) return
    suggestions = cities
    renderSuggestions(cities)
  } catch {
    // suggestions are not important, just hide them on error
    hideSuggestions()
  }
}

/* ---------- weather ---------- */

function showLoading() {
  weatherEl.innerHTML = '<div class="spinner"></div>'
}

function showError(message: string) {
  weatherEl.innerHTML = `
    <div class="error-card">
      ${icon('alert', 40)}
      <p>${escapeHtml(message)}</p>
    </div>
  `
}

function formatDay(date: string, index: number): string {
  if (index === 0) return 'Today'
  return new Date(`${date}T00:00`).toLocaleDateString('en-US', { weekday: 'short' })
}

function renderWeather(placeName: string, weather: Weather) {
  const { current, daily } = weather
  const info = getWeatherInfo(current.weather_code, current.is_day === 1)

  const days = daily.time
    .map((date, i) => {
      const dayInfo = getWeatherInfo(daily.weather_code[i])
      return `
        <li class="day">
          <span class="day-name">${formatDay(date, i)}</span>
          <span class="day-icon" title="${dayInfo.label}">${icon(dayInfo.icon, 26)}</span>
          <span class="day-temp">
            <b>${Math.round(daily.temperature_2m_max[i])}°</b>
            <span>${Math.round(daily.temperature_2m_min[i])}°</span>
          </span>
        </li>
      `
    })
    .join('')

  weatherEl.innerHTML = `
    <div class="current ${current.is_day ? 'day-bg' : 'night-bg'}">
      <h2>${escapeHtml(placeName)}</h2>
      <div class="current-main">
        <span class="current-icon">${icon(info.icon, 72)}</span>
        <span class="current-temp">${Math.round(current.temperature_2m)}°</span>
      </div>
      <p class="current-label">${info.label}</p>
      <div class="details">
        <div><span>Feels like</span><b>${Math.round(current.apparent_temperature)}°</b></div>
        <div><span>Humidity</span><b>${current.relative_humidity_2m}%</b></div>
        <div><span>Wind</span><b>${Math.round(current.wind_speed_10m)} km/h</b></div>
      </div>
    </div>
    <h3 class="forecast-title">7-day forecast</h3>
    <ul class="forecast">${days}</ul>
  `
}

async function loadWeather(placeName: string, latitude: number, longitude: number) {
  showLoading()

  try {
    const weather = await getWeather(latitude, longitude)
    renderWeather(placeName, weather)
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Could not load the weather')
  }
}

function selectCity(city: City) {
  input.value = city.name
  hideSuggestions()
  clearSearchError()
  loadWeather(cityLabel(city), city.latitude, city.longitude)

  try {
    localStorage.setItem(LAST_CITY_KEY, JSON.stringify(city))
  } catch {
    // not a big deal if it doesn't save
  }
}

/* ---------- geolocation ---------- */

function getGeoErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access was denied. Allow it in your browser settings or search for a city.'
    case error.POSITION_UNAVAILABLE:
      return 'Your location is not available right now.'
    case error.TIMEOUT:
      return 'Getting your location took too long. Try again.'
    default:
      return 'Could not get your location.'
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    showSearchError('Your browser does not support geolocation')
    return
  }

  clearSearchError()
  hideSuggestions()
  locationBtn.disabled = true
  showLoading()

  navigator.geolocation.getCurrentPosition(
    (position) => {
      locationBtn.disabled = false
      const { latitude, longitude } = position.coords
      loadWeather('Your location', latitude, longitude)
    },
    (error) => {
      locationBtn.disabled = false
      showError(getGeoErrorMessage(error))
    },
    { timeout: 10000 },
  )
}

/* ---------- events ---------- */

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  clearTimeout(debounceTimer)

  const query = input.value.trim()
  const error = validateQuery(query)
  if (error) {
    showSearchError(error)
    return
  }

  clearSearchError()
  hideSuggestions()
  showLoading()

  try {
    const cities = await searchCities(query)
    if (cities.length === 0) {
      showError(`Couldn't find "${query}". Check the spelling and try again.`)
      return
    }
    selectCity(cities[0])
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Something went wrong')
  }
})

input.addEventListener('input', () => {
  clearSearchError()
  clearTimeout(debounceTimer)

  const query = input.value.trim()
  if (query.length < 2) {
    hideSuggestions()
    return
  }

  debounceTimer = setTimeout(() => loadSuggestions(query), 300)
})

suggestionsEl.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest('button')
  if (!button) return

  const city = suggestions[Number(button.dataset.index)]
  if (city) selectCity(city)
})

input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideSuggestions()
})

// close suggestions when clicking somewhere else
document.addEventListener('click', (event) => {
  if (!form.contains(event.target as Node)) hideSuggestions()
})

locationBtn.addEventListener('click', useMyLocation)

// show the last searched city on page load
try {
  const saved = localStorage.getItem(LAST_CITY_KEY)
  if (saved) {
    const city: City = JSON.parse(saved)
    input.value = city.name
    loadWeather(cityLabel(city), city.latitude, city.longitude)
  }
} catch {
  // ignore broken data
}
