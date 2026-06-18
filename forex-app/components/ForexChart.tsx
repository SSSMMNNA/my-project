'use client'

import { useEffect, useRef } from 'react'
import type { OHLCBar, IndicatorSeries, Timeframe } from '@/lib/types'

interface ForexChartProps {
  bars: OHLCBar[]
  indicators: IndicatorSeries
  timeframe: Timeframe
}

export function ForexChart({ bars, indicators, timeframe }: ForexChartProps) {
  const mainContainerRef = useRef<HTMLDivElement>(null)
  const rsiContainerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!mainContainerRef.current || !rsiContainerRef.current || bars.length === 0) return

    let cancelled = false

    async function init() {
      const LWC = await import('lightweight-charts')
      if (cancelled) return

      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      const mainEl = mainContainerRef.current!
      const rsiEl = rsiContainerRef.current!

      const toTime = (t: number) => t as unknown as import('lightweight-charts').UTCTimestamp

      const baseChartOptions = {
        layout: {
          background: { color: '#0d0d1a' },
          textColor: '#c5c8c9',
        },
        grid: {
          vertLines: { color: '#1a1a2e' },
          horzLines: { color: '#1a1a2e' },
        },
        crosshair: {
          mode: LWC.CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: '#1e1e35',
        },
        timeScale: {
          borderColor: '#1e1e35',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: true,
        handleScale: true,
      }

      const mainChart = LWC.createChart(mainEl, {
        ...baseChartOptions,
        width: mainEl.clientWidth,
        height: mainEl.clientHeight,
      })

      const rsiChart = LWC.createChart(rsiEl, {
        ...baseChartOptions,
        width: rsiEl.clientWidth,
        height: rsiEl.clientHeight,
        timeScale: {
          ...baseChartOptions.timeScale,
          visible: false,
        },
      })

      const candleSeries = mainChart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })

      candleSeries.setData(
        bars.map(b => ({
          time: toTime(b.time),
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }))
      )

      if (indicators.sma20.length > 0) {
        const s = mainChart.addLineSeries({ color: '#2196F3', lineWidth: 1, title: 'SMA20' })
        s.setData(indicators.sma20.map(d => ({ time: toTime(d.time), value: d.value })))
      }

      if (indicators.sma50.length > 0) {
        const s = mainChart.addLineSeries({ color: '#ff9800', lineWidth: 1, title: 'SMA50' })
        s.setData(indicators.sma50.map(d => ({ time: toTime(d.time), value: d.value })))
      }

      if (indicators.ema200.length > 0) {
        const s = mainChart.addLineSeries({
          color: '#f44336',
          lineWidth: 1,
          lineStyle: LWC.LineStyle.Dashed,
          title: 'EMA200',
        })
        s.setData(indicators.ema200.map(d => ({ time: toTime(d.time), value: d.value })))
      }

      if (indicators.bbUpper.length > 0) {
        const s = mainChart.addLineSeries({
          color: 'rgba(150,150,150,0.5)',
          lineWidth: 1,
          lineStyle: LWC.LineStyle.Dashed,
          title: 'BB Upper',
        })
        s.setData(indicators.bbUpper.map(d => ({ time: toTime(d.time), value: d.value })))
      }

      if (indicators.bbMiddle.length > 0) {
        const s = mainChart.addLineSeries({
          color: 'rgba(150,150,150,0.6)',
          lineWidth: 1,
          title: 'BB Mid',
        })
        s.setData(indicators.bbMiddle.map(d => ({ time: toTime(d.time), value: d.value })))
      }

      if (indicators.bbLower.length > 0) {
        const s = mainChart.addLineSeries({
          color: 'rgba(150,150,150,0.5)',
          lineWidth: 1,
          lineStyle: LWC.LineStyle.Dashed,
          title: 'BB Lower',
        })
        s.setData(indicators.bbLower.map(d => ({ time: toTime(d.time), value: d.value })))
      }

      const slicedBars = bars.slice(-20)

      for (const sup of indicators.supports.slice(0, 4)) {
        const s = mainChart.addLineSeries({
          color: 'rgba(38, 166, 154, 0.6)',
          lineWidth: 1,
          lineStyle: LWC.LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          title: `S ${sup.toFixed(2)}`,
        })
        s.setData(slicedBars.map(b => ({ time: toTime(b.time), value: sup })))
      }

      for (const res of indicators.resistances.slice(0, 4)) {
        const s = mainChart.addLineSeries({
          color: 'rgba(239, 83, 80, 0.6)',
          lineWidth: 1,
          lineStyle: LWC.LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          title: `R ${res.toFixed(2)}`,
        })
        s.setData(slicedBars.map(b => ({ time: toTime(b.time), value: res })))
      }

      let rsiSeriesInst: ReturnType<typeof rsiChart.addLineSeries> | null = null

      if (indicators.rsi.length > 0) {
        rsiSeriesInst = rsiChart.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 2,
          title: 'RSI',
          priceScaleId: 'right',
        })
        rsiSeriesInst.setData(indicators.rsi.map(d => ({ time: toTime(d.time), value: d.value })))

        rsiSeriesInst.createPriceLine({
          price: 70,
          color: 'rgba(239, 83, 80, 0.5)',
          lineWidth: 1,
          lineStyle: LWC.LineStyle.Dashed,
          axisLabelVisible: true,
          title: '70',
        })
        rsiSeriesInst.createPriceLine({
          price: 30,
          color: 'rgba(38, 166, 154, 0.5)',
          lineWidth: 1,
          lineStyle: LWC.LineStyle.Dashed,
          axisLabelVisible: true,
          title: '30',
        })
        rsiSeriesInst.createPriceLine({
          price: 50,
          color: 'rgba(148, 163, 184, 0.3)',
          lineWidth: 1,
          lineStyle: LWC.LineStyle.Dotted,
          axisLabelVisible: false,
          title: '',
        })

        rsiChart.priceScale('right').applyOptions({
          scaleMargins: { top: 0.1, bottom: 0.1 },
          autoScale: false,
        })

        rsiSeriesInst.applyOptions({
          autoscaleInfoProvider: () => ({
            priceRange: { minValue: 0, maxValue: 100 },
            margins: { above: 0.1, below: 0.1 },
          }),
        })
      }

      mainChart.timeScale().fitContent()
      rsiChart.timeScale().fitContent()

      const capturedRsiSeries = rsiSeriesInst
      const capturedCandleSeries = candleSeries

      const syncMain = mainChart.subscribeCrosshairMove((param) => {
        if (param.time && capturedRsiSeries) {
          rsiChart.setCrosshairPosition(param.point?.y ?? 0, param.time as import('lightweight-charts').UTCTimestamp, capturedRsiSeries)
        } else {
          rsiChart.clearCrosshairPosition()
        }
      })

      const syncRsi = rsiChart.subscribeCrosshairMove((param) => {
        if (param.time) {
          mainChart.setCrosshairPosition(param.point?.y ?? 0, param.time as import('lightweight-charts').UTCTimestamp, capturedCandleSeries)
        } else {
          mainChart.clearCrosshairPosition()
        }
      })

      const resizeObserver = new ResizeObserver(() => {
        if (mainEl) mainChart.resize(mainEl.clientWidth, mainEl.clientHeight)
        if (rsiEl) rsiChart.resize(rsiEl.clientWidth, rsiEl.clientHeight)
      })
      resizeObserver.observe(mainEl)
      resizeObserver.observe(rsiEl)

      void syncMain
      void syncRsi

      cleanupRef.current = () => {
        resizeObserver.disconnect()
        try { mainChart.remove() } catch {}
        try { rsiChart.remove() } catch {}
      }
    }

    init()

    return () => {
      cancelled = true
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [bars, indicators, timeframe])

  return (
    <div className="relative w-full bg-bg-primary">
      <div
        ref={mainContainerRef}
        className="w-full h-[300px] lg:h-[420px]"
      />
      <div
        ref={rsiContainerRef}
        className="w-full h-[80px] lg:h-[100px] border-t border-border"
      />
    </div>
  )
}
