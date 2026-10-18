export interface City {
  id: number
  name: string
  country: string
  admin1?: string // region / state
  latitude: number
  longitude: number
}

export interface Weather {
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    wind_speed_10m: number
    weather_code: number
    is_day: number
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}
