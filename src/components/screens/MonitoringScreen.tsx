import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { CircularGauge } from '../ui/CircularGauge'
import { SparkChart } from '../ui/SparkChart'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'

function gaugeColor(v: number, isTemp = false) {
  if (isTemp) return v > 80 ? '#ff4757' : v > 60 ? '#ffb347' : '#9d4edd'
  return v > 82 ? '#ff4757' : v > 62 ? '#ffb347' : '#9d4edd'
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: '#404040', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#c4c4c4', fontWeight: 500 }}>{val}</div>
    </div>
  )
}

function TempCard({ id, title, sub, value, max, tempUnit, hist }: {
  id: string; title: string; sub: string; value: number; max: number; tempUnit: string; hist: number[]
}) {
  const gc = gaugeColor(value, true)
  const disp = tempUnit === '°F' ? Math.round(value * 9 / 5 + 32) : Math.round(value)
  const unit = tempUnit === '°F' ? '°F' : '°C'
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
          <CircularGauge value={value} max={max} size={130} stroke={10} color={gc}/>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 30, fontWeight: 700, color: '#f2f2f2', lineHeight: 1 }}>
              {disp}<span style={{ fontSize: 14, color: '#3a3a3a', fontWeight: 400 }}>{unit}</span>
            </div>
            <div style={{ fontSize: 9, color: '#3a3a3a', marginTop: 5, letterSpacing: '1.2px', textTransform: 'uppercase' }}>Temp</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 2, letterSpacing: '-0.3px' }}>{title}</div>
          <div style={{ fontSize: 10, color: '#3e3e3e', marginBottom: 16, fontWeight: 500 }}>{sub}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Stat label="Valeur" val={`${disp}${unit}`}/>
            <Stat label="Max" val={`${max}${unit}`}/>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #1c1c1c' }}>
        <SparkChart data={hist} color={gc} height={44} uid={id}/>
      </div>
    </Card>
  )
}

function PumpCard({ rpm, hist }: { rpm: number; hist: number[] }) {
  const rpmPct = Math.min(100, (rpm / 3000) * 100)
  const gc = '#9d4edd'
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0', marginBottom: 16, letterSpacing: '-0.2px' }}>Pump RPM</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
          <CircularGauge value={rpmPct} size={90} stroke={8} color={gc}/>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#f2f2f2', lineHeight: 1 }}>{Math.round(rpm)}</div>
            <div style={{ fontSize: 8, color: '#3a3a3a', marginTop: 4, letterSpacing: '1px' }}>RPM</div>
          </div>
        </div>
        <div>
          <Stat label="Vitesse" val={`${Math.round(rpm)} RPM`}/>
          <Stat label="Source" val="Liquid Cooling"/>
        </div>
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1c1c1c' }}>
        <SparkChart data={hist} color={gc} height={34} uid="pump"/>
      </div>
    </Card>
  )
}

function StorageCard() {
  const drives = [
    { label: '/dev/nvme0', used: 674, total: 954 },
    { label: '/dev/sda1',  used: 1600, total: 1800 },
  ]
  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} TB` : `${v} GB`
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0', marginBottom: 18, letterSpacing: '-0.2px' }}>Storage</div>
      {drives.map(({ label, used, total }) => {
        const pct = used / total * 100
        const c = pct > 90 ? '#ff4757' : pct > 74 ? '#ffb347' : '#9d4edd'
        return (
          <div key={label} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: c, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 9, color: '#484848' }}>{fmt(used)} / {fmt(total)}</span>
            </div>
            <ProgressBar value={pct} max={100} color={c} height={3}/>
          </div>
        )
      })}
      <div style={{ fontSize: 9, color: '#2a2a2a', marginTop: 8 }}>* Données approximatives</div>
    </Card>
  )
}

const genHist = (base = 20, len = 52): number[] => {
  const d: number[] = []; let v = base + Math.random() * 5
  for (let i = 0; i < len; i++) { v += (Math.random() - 0.47) * 4; v = Math.max(0, Math.min(100, v)); d.push(v) }
  return d
}

export function MonitoringScreen() {
  const { state } = useApp()
  const { temperatures, tempUnit, deviceStatus } = state
  const [cpuH, setCpuH] = useState(() => genHist(temperatures.cpu))
  const [gpuH, setGpuH] = useState(() => genHist(temperatures.gpu))
  const [liqH, setLiqH] = useState(() => genHist(temperatures.liquid))
  const [pumpH, setPumpH] = useState(() => genHist((temperatures.pumpRpm / 3000) * 100))

  useEffect(() => {
    setCpuH(h => [...h.slice(-51), temperatures.cpu])
    setGpuH(h => [...h.slice(-51), temperatures.gpu])
    setLiqH(h => [...h.slice(-51), temperatures.liquid])
    setPumpH(h => [...h.slice(-51), Math.min(100, (temperatures.pumpRpm / 3000) * 100)])
  }, [temperatures])

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Monitoring</div>
        {deviceStatus.connected && (
          <div style={{ fontSize: 11, color: '#484848', background: '#111', border: '1px solid #1e1e1e', padding: '4px 12px', borderRadius: 20 }}>
            {deviceStatus.productName}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <TempCard id="cpu" title="CPU" sub="CPU temperature" value={temperatures.cpu} max={100} tempUnit={tempUnit} hist={cpuH}/>
        <TempCard id="gpu" title="GPU" sub="GPU temperature" value={temperatures.gpu} max={100} tempUnit={tempUnit} hist={gpuH}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <TempCard id="liq" title="Liquide" sub="Liquid coolant temperature" value={temperatures.liquid} max={60} tempUnit={tempUnit} hist={liqH}/>
        <PumpCard rpm={temperatures.pumpRpm} hist={pumpH}/>
        <StorageCard/>
      </div>

      <div style={{ padding: '10px 18px', background: '#0d0d0d', border: '1px solid #181818', borderRadius: 8, display: 'flex', gap: 20 }}>
        {[
          { label: 'CPU',    val: `${Math.round(temperatures.cpu)}°C`    },
          { label: 'GPU',    val: `${Math.round(temperatures.gpu)}°C`    },
          { label: 'Liquid', val: `${Math.round(temperatures.liquid)}°C` },
          { label: 'Pump',   val: `${Math.round(temperatures.pumpRpm)} RPM` },
        ].map(({ label, val }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>{label}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#555', fontWeight: 500 }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
