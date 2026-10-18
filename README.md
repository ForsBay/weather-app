# Weather App

Weather app with city search and 7-day forecast. Built with TypeScript, HTML and CSS, no frameworks.

Uses the free [Open-Meteo API](https://open-meteo.com/) for geocoding and weather (no API key needed).

## Features

- City search with autocomplete suggestions (debounced)
- Current weather: temperature, feels like, humidity, wind
- 7-day forecast
- "Use my location" button with the Geolocation API
- Remembers the last city in localStorage
- Error handling: city not found, network errors, too many requests, location denied / timeout
- Day and night themes for the current weather card
- Responsive design

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Deploys to GitHub Pages automatically on push to `main`.
