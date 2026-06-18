import { NextRequest, NextResponse } from 'next/server'
import type { OHLCBar, Timeframe } from '@/lib/types'

const cache = new Map<string, { data: OHLCBar[]; ts: number }>()

const CACHE_TTL: Record<string, number> = {
  '1m': 60_000,
  '5m': 120_000,
  '15m': 300_000,
  '1h': 900_000,
  '4h': 1_800_000,
  '1d': 3_600_000,
}

function resampleTo4H(hourlyBars: OHLCBar[]): OHLCBar[] {
  const groups = new Map<number, OHLCBar[]>()

  for (const bar of hourlyBars) {
    const date = new Date(bar.time * 1000)
    const hour = date.getUTCHours()
    const groupHour = Math.floor(hour / 4) * 4
    date.setUTCHours(groupHour, 0, 0, 0)
    const key = Math.floor(date.getTime() / 1000)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(bar)
  }

  const result: OHLCBar[] = []
  groups.forEach((bars, time) => {
    if (bars.length === 0) return
    const open = bars[0].open
    const close = bars[bars.length - 1].close
    const high = Math.max(...bars.map(b => b.high))
    const low = Math.min(...bars.map(b => b.low))
    result.push({ time, open, high, low, close })
  })

  return result.sort((a, b) => a.time - b.time)
}

function parseAlphaVantageIntraday(json: Record<string, unknown>, interval: string): OHLCBar[] {
  const seriesKey = `Time Series FX (${interval})`
  const series = json[seriesKey] as Record<string, Record<string, string>> | undefined
  if (!series) return []

  const bars: OHLCBar[] = []
  for (const [timestamp, values] of Object.entries(series)) {
    const date = new Date(timestamp + ' UTC')
    const time = Math.floor(date.getTime() / 1000)
    const open = parseFloat(values['1. open'])
    const high = parseFloat(values['2. high'])
    const low = parseFloat(values['3. low'])
    const close = parseFloat(values['4. close'])
    if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
      bars.push({ time, open, high, low, close })
    }
  }

  return bars.sort((a, b) => a.time - b.time).slice(-300)
}

function parseAlphaVantageDaily(json: Record<string, unknown>): OHLCBar[] {
  const seriesKey = 'Time Series FX (Daily)'
  const series = json[seriesKey] as Record<string, Record<string, string>> | undefined
  if (!series) return []

  const bars: OHLCBar[] = []
  for (const [dateStr, values] of Object.entries(series)) {
    const date = new Date(dateStr + 'T12:00:00Z')
    const time = Math.floor(date.getTime() / 1000)
    const open = parseFloat(values['1. open'])
    const high = parseFloat(values['2. high'])
    const low = parseFloat(values['3. low'])
    const close = parseFloat(values['4. close'])
    if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
      bars.push({ time, open, high, low, close })
    }
  }

  return bars.sort((a, b) => a.time - b.time).slice(-300)
}

function generateMockData(count = 200, timeframe: string): OHLCBar[] {
  const BASE_PRICE = 158.00
  const VOLATILITY: Record<string, number> = {
    '1m': 0.05, '5m': 0.10, '15m': 0.15, '1h': 0.30, '4h': 0.60, '1d': 1.20,
  }
  const INTERVAL_SECONDS: Record<string, number> = {
    '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400,
  }
  const vol = VOLATILITY[timeframe] ?? 0.30
  const interval = INTERVAL_SECONDS[timeframe] ?? 3600
  const now = Math.floor(Date.now() / 1000)
  const startTime = now - count * interval

  let price = BASE_PRICE
  const bars: OHLCBar[] = []

  for (let i = 0; i < count; i++) {
    const open = price
    const change = (Math.random() - 0.5) * vol * 2
    const close = Math.round((open + change) * 1000) / 1000
    const high = Math.round((Math.max(open, close) + Math.random() * vol * 0.5) * 1000) / 1000
    const low = Math.round((Math.min(open, close) - Math.random() * vol * 0.5) * 1000) / 1000
    bars.push({ time: startTime + i * interval, open, high, low, close })
    price = close
  }
  return bars
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const timeframe = (searchParams.get('timeframe') ?? '1h') as Timeframe
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY

  const cached = cache.get(timeframe)
  if (cached && Date.now() - cached.ts < (CACHE_TTL[timeframe] ?? 300_000)) {
    return NextResponse.json({ data: cached.data, cached: true })
  }

  if (!apiKey || apiKey === 'your_api_key_here') {
    const mockData = generateMockData(200, timeframe)
    cache.set(timeframe, { data: mockData, ts: Date.now() })
    return NextResponse.json({ data: mockData, mock: true })
  }

  try {
    let bars: OHLCBar[]

    if (timeframe === '4h') {
      const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=USD&to_symbol=JPY&interval=60min&outputsize=full&apikey=${apiKey}`
      const res = await fetch(url, { next: { revalidate: 900 } })
      const json = await res.json()
      const hourly = parseAlphaVantageIntraday(json, '60min')
      bars = resampleTo4H(hourly)
    } else if (timeframe === '1d') {
      const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=USD&to_symbol=JPY&outputsize=full&apikey=${apiKey}`
      const res = await fetch(url, { next: { revalidate: 3600 } })
      const json = await res.json()
      bars = parseAlphaVantageDaily(json)
    } else {
      const intervalMap: Record<string, string> = { '1m': '1min', '5m': '5min', '15m': '15min', '1h': '60min' }
      const interval = intervalMap[timeframe] ?? '60min'
      const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=USD&to_symbol=JPY&interval=${interval}&outputsize=full&apikey=${apiKey}`
      const res = await fetch(url, { next: { revalidate: CACHE_TTL[timeframe] / 1000 } })
      const json = await res.json()
      bars = parseAlphaVantageIntraday(json, interval)
    }

    if (bars.length === 0) {
      const mockData = generateMockData(200, timeframe)
      return NextResponse.json({ data: mockData, mock: true })
    }

    cache.set(timeframe, { data: bars, ts: Date.now() })
    return NextResponse.json({ data: bars })
  } catch {
    const mockData = generateMockData(200, timeframe)
    return NextResponse.json({ data: mockData, mock: true, error: 'API fetch failed' })
  }
}
