import type { OHLCBar, IndicatorSeries } from './types'

export function calcSMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) {
        sum += closes[j]
      }
      result.push(sum / period)
    }
  }
  return result
}

export function calcEMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const multiplier = 2 / (period + 1)
  let ema: number | null = null

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else if (i === period - 1) {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += closes[j]
      }
      ema = sum / period
      result.push(ema)
    } else {
      ema = (closes[i] - ema!) * multiplier + ema!
      result.push(ema)
    }
  }
  return result
}

export function calcBollingerBands(closes: number[], period = 20, mult = 2): {
  upper: (number | null)[]
  middle: (number | null)[]
  lower: (number | null)[]
} {
  const sma = calcSMA(closes, period)
  const upper: (number | null)[] = []
  const middle: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) {
      upper.push(null)
      middle.push(null)
      lower.push(null)
    } else {
      const mean = sma[i] as number
      let variance = 0
      for (let j = i - period + 1; j <= i; j++) {
        variance += (closes[j] - mean) ** 2
      }
      const stddev = Math.sqrt(variance / period)
      upper.push(mean + mult * stddev)
      middle.push(mean)
      lower.push(mean - mult * stddev)
    }
  }
  return { upper, middle, lower }
}

export function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = []

  if (closes.length < period + 1) {
    return closes.map(() => null)
  }

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1]
    if (change >= 0) {
      avgGain += change
    } else {
      avgLoss += Math.abs(change)
    }
  }
  avgGain /= period
  avgLoss /= period

  for (let i = 0; i < period; i++) {
    result.push(null)
  }

  if (avgLoss === 0) {
    result.push(100)
  } else {
    const rs = avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    const gain = change >= 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    if (avgLoss === 0) {
      result.push(100)
    } else {
      const rs = avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    }
  }
  return result
}

export function calcMACD(closes: number[], fast = 12, slow = 26, signal = 9): {
  line: (number | null)[]
  signal: (number | null)[]
  hist: (number | null)[]
} {
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)

  const macdLine: (number | null)[] = closes.map((_, i) => {
    const f = emaFast[i]
    const s = emaSlow[i]
    if (f === null || s === null) return null
    return f - s
  })

  const macdValues = macdLine.filter((v): v is number => v !== null)
  const signalRaw = calcEMA(macdValues, signal)

  const signalLine: (number | null)[] = []
  const hist: (number | null)[] = []
  let macdIdx = 0

  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] === null) {
      signalLine.push(null)
      hist.push(null)
    } else {
      const sigVal = signalRaw[macdIdx]
      signalLine.push(sigVal)
      if (sigVal !== null && macdLine[i] !== null) {
        hist.push((macdLine[i] as number) - sigVal)
      } else {
        hist.push(null)
      }
      macdIdx++
    }
  }

  return { line: macdLine, signal: signalLine, hist }
}

function findPivotHighs(bars: OHLCBar[], lookback = 5): number[] {
  const pivots: number[] = []
  for (let i = lookback; i < bars.length - lookback; i++) {
    let isPivot = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && bars[j].high >= bars[i].high) {
        isPivot = false
        break
      }
    }
    if (isPivot) {
      pivots.push(bars[i].high)
    }
  }
  return pivots
}

function findPivotLows(bars: OHLCBar[], lookback = 5): number[] {
  const pivots: number[] = []
  for (let i = lookback; i < bars.length - lookback; i++) {
    let isPivot = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && bars[j].low <= bars[i].low) {
        isPivot = false
        break
      }
    }
    if (isPivot) {
      pivots.push(bars[i].low)
    }
  }
  return pivots
}

function clusterLevels(levels: number[], threshold = 0.3): number[] {
  if (levels.length === 0) return []
  const sorted = [...levels].sort((a, b) => a - b)
  const clusters: number[][] = []
  let current: number[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const pct = ((sorted[i] - sorted[i - 1]) / sorted[i - 1]) * 100
    if (pct <= threshold) {
      current.push(sorted[i])
    } else {
      clusters.push(current)
      current = [sorted[i]]
    }
  }
  clusters.push(current)

  return clusters
    .map(c => c.reduce((a, b) => a + b, 0) / c.length)
    .sort((a, b) => a - b)
}

export function detectSupportResistance(bars: OHLCBar[]): {
  supports: number[]
  resistances: number[]
} {
  const currentPrice = bars[bars.length - 1].close

  const pivotHighs = findPivotHighs(bars)
  const pivotLows = findPivotLows(bars)

  const clusteredResistances = clusterLevels(pivotHighs.filter(h => h > currentPrice))
  const clusteredSupports = clusterLevels(pivotLows.filter(l => l < currentPrice))

  const resistances = clusteredResistances
    .sort((a, b) => a - b)
    .slice(0, 4)

  const supports = clusteredSupports
    .sort((a, b) => b - a)
    .slice(0, 4)
    .sort((a, b) => a - b)

  return { supports, resistances }
}

function calcTrendChannel(bars: OHLCBar[], lookback = 50): {
  upper: { time: number; value: number }[]
  lower: { time: number; value: number }[]
} {
  const slice = bars.slice(-lookback)
  const n = slice.length

  if (n < 2) {
    return { upper: [], lower: [] }
  }

  const closes = slice.map(b => b.close)

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += closes[i]
    sumXY += i * closes[i]
    sumX2 += i * i
  }

  const denom = n * sumX2 - sumX * sumX
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
  const intercept = (sumY - slope * sumX) / n

  const predicted = slice.map((_, i) => intercept + slope * i)

  let variance = 0
  for (let i = 0; i < n; i++) {
    variance += (closes[i] - predicted[i]) ** 2
  }
  const stddev = Math.sqrt(variance / n)

  const upper: { time: number; value: number }[] = []
  const lower: { time: number; value: number }[] = []

  for (let i = 0; i < n; i++) {
    const mid = predicted[i]
    upper.push({ time: slice[i].time, value: mid + 2 * stddev })
    lower.push({ time: slice[i].time, value: mid - 2 * stddev })
  }

  return { upper, lower }
}

export function computeAllIndicators(bars: OHLCBar[]): IndicatorSeries {
  const closes = bars.map(b => b.close)

  const sma20Raw = calcSMA(closes, 20)
  const sma50Raw = calcSMA(closes, 50)
  const ema200Raw = calcEMA(closes, 200)
  const bbRaw = calcBollingerBands(closes)
  const rsiRaw = calcRSI(closes)
  const macdRaw = calcMACD(closes)
  const { supports, resistances } = detectSupportResistance(bars)
  const channel = calcTrendChannel(bars)

  function toSeries(arr: (number | null)[]): { time: number; value: number }[] {
    return bars
      .map((b, i) => ({ time: b.time, value: arr[i] as number }))
      .filter(x => x.value !== null && !isNaN(x.value))
  }

  return {
    sma20: toSeries(sma20Raw),
    sma50: toSeries(sma50Raw),
    ema200: toSeries(ema200Raw),
    bbUpper: toSeries(bbRaw.upper),
    bbMiddle: toSeries(bbRaw.middle),
    bbLower: toSeries(bbRaw.lower),
    rsi: toSeries(rsiRaw),
    macdLine: toSeries(macdRaw.line),
    macdSignal: toSeries(macdRaw.signal),
    macdHist: toSeries(macdRaw.hist),
    supports,
    resistances,
    channelUpper: channel.upper,
    channelLower: channel.lower,
  }
}
