import type { City, Weather } from './types'

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast'

async function request<T>(url: string): Promise<T> {
  let res: Response

  try {
    res = await fetch(url)
  } catch {
    throw new Error('Network error. Check your internet connection.')
  }

  if (res.status === 429) {
    throw new Error('Too many requests. Please wait a minute and try again.')
  }
  if (!res.ok) {
    throw new Error(`Weather service error (status ${res.status})`)
  }

  return res.json()
}

export async function searchCities(query: string): Promise<City[]> {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
  })

  const data = await request<{ results?: City[] }>(`${GEO_URL}?${params}`)

  // API doesn't return "results" at all when nothing is found
  return data.results ?? []
}

export function getWeather(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
  })

  return request<Weather>(`${WEATHER_URL}?${params}`)
}
