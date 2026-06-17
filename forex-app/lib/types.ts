export interface OHLCBar {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export interface IndicatorSeries {
  sma20: { time: number; value: number }[]
  sma50: { time: number; value: number }[]
  ema200: { time: number; value: number }[]
  bbUpper: { time: number; value: number }[]
  bbMiddle: { time: number; value: number }[]
  bbLower: { time: number; value: number }[]
  rsi: { time: number; value: number }[]
  macdLine: { time: number; value: number }[]
  macdSignal: { time: number; value: number }[]
  macdHist: { time: number; value: number }[]
  supports: number[]
  resistances: number[]
  channelUpper: { time: number; value: number }[]
  channelLower: { time: number; value: number }[]
}

export interface AnalysisResult {
  timeframe: string
  trend: 'bullish' | 'bearish' | 'neutral'
  bias: 'buy' | 'sell' | 'wait'
  rsiValue: number
  bbPosition: 'upper' | 'middle' | 'lower' | 'inside'
  trendText: string
  momentumText: string
  keyLevelsText: string
  setupText: string
  riskText: string
  nearestSupport: number
  nearestResistance: number
}

export interface EconomicEvent {
  id: string
  datetimeJST: string
  currency: 'USD' | 'JPY' | 'BOTH'
  impact: 'high' | 'medium' | 'low'
  titleJA: string
  description: string
  previous?: string
  forecast?: string
}
