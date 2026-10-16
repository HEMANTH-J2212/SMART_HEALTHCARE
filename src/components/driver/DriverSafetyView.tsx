import React, { useState, useEffect } from 'react';
import {
  Car,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Eye,
  Heart,
  Gauge,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Navigation,
  Compass,
  Zap,
  Volume2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DriverSafetyReading } from '../../types';
import { api } from '../../services/api';

export const DriverSafetyView: React.FC = () => {
  const { user } = useAuth();
  const driverId = user?.id || 'pat-1';

  const [history, setHistory] = useState<DriverSafetyReading[]>([]);
  const [loading, setLoading] = useState(false);

  // Live IoT telemetry states
  const [heartRate, setHeartRate] = useState(74);
  const [hrv, setHrv] = useState(54);
  const [blinkRate, setBlinkRate] = useState(18);
  const [eyeClosureMs, setEyeClosureMs] = useState(140);
  const [steeringStability, setSteeringStability] = useState(94);
  const [fatigueIndex, setFatigueIndex] = useState(18);

  const [currentResult, setCurrentResult] = useState<DriverSafetyReading | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationScenario, setSimulationScenario] = useState<'normal' | 'drowsy' | 'critical'>('normal');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDriverReadings(driverId);
      setHistory(res);
      if (res.length > 0) {
        setCurrentResult(res[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [driverId]);

  const handleTransmitTelemetry = async (scenario?: 'normal' | 'drowsy' | 'critical') => {
    setIsSimulating(true);

    let hr = heartRate;
    let v_hrv = hrv;
    let br = blinkRate;
    let eyeMs = eyeClosureMs;
    let steer = steeringStability;
    let fatigue = fatigueIndex;

    const targetScenario = scenario || simulationScenario;

    if (targetScenario === 'normal') {
      hr = Math.floor(70 + Math.random() * 10);
      v_hrv = Math.floor(50 + Math.random() * 15);
      br = 18;
      eyeMs = 135;
      steer = 95;
      fatigue = 15;
    } else if (targetScenario === 'drowsy') {
      hr = Math.floor(82 + Math.random() * 8);
      v_hrv = 32;
      br = 8; // slow blinks
      eyeMs = 240; // prolonged eye closure
      steer = 74;
      fatigue = 54;
    } else if (targetScenario === 'critical') {
      hr = 108; // acute cardiac stress or severe sleep deprivation
      v_hrv = 18;
      br = 5;
      eyeMs = 420; // microsleep event!
      steer = 48; // erratic steering
      fatigue = 88;
    }

    setHeartRate(hr);
    setHrv(v_hrv);
    setBlinkRate(br);
    setEyeClosureMs(eyeMs);
    setSteeringStability(steer);
    setFatigueIndex(fatigue);

    try {
      const res = await api.submitDriverSafetyReading({
        driverId,
        driverName: user?.name || 'Driver',
        heartRate: hr,
        heartRateVariability: v_hrv,
        blinkFrequencyPerMin: br,
        eyeClosureDurationMs: eyeMs,
        steeringStability: steer,
        fatigueIndex: fatigue,
      });

      setCurrentResult(res.reading);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-xs font-semibold text-cyan-200 mb-2">
              <Car className="w-3.5 h-3.5 text-cyan-300" /> Driver Health & Accident Prevention Telemetry
            </div>
            <h1 className="text-2xl font-black tracking-tight">Driver VitalGuard Safety Pod</h1>
            <p className="text-cyan-200/80 text-xs max-w-2xl mt-1">
              In-vehicle IoT sensors continuous monitoring: Heart Rate, HRV autonomic stress, PERCLOS eye closure, and steering gyro stability powered by Gemini AI early risk mitigation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTransmitTelemetry()}
              disabled={isSimulating}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Stream Live IoT Telemetry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-slate-800">Test Driver Scenarios:</span>
          <span className="text-slate-500 ml-1">Simulate various physiological driver conditions:</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTransmitTelemetry('normal')}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded-lg transition-colors"
          >
            🟢 Normal & Alert
          </button>
          <button
            onClick={() => handleTransmitTelemetry('drowsy')}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 rounded-lg transition-colors"
          >
            🟡 Drowsy / Fatigued
          </button>
          <button
            onClick={() => handleTransmitTelemetry('critical')}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 rounded-lg transition-colors"
          >
            🔴 Critical Microsleep / Distress
          </button>
        </div>
      </div>

      {/* Live Heads-Up Dashboard */}
      {currentResult && (
        <div
          className={`rounded-2xl border p-6 transition-all shadow-md ${
            currentResult.riskLevel === 'safe'
              ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/40 text-white'
              : currentResult.riskLevel === 'moderate'
              ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-orange-950 border-amber-500/40 text-white'
              : 'bg-gradient-to-r from-rose-950 via-red-950 to-slate-900 border-rose-500/60 text-white animate-pulse'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl border ${
                  currentResult.riskLevel === 'safe'
                    ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                    : currentResult.riskLevel === 'moderate'
                    ? 'bg-amber-500/20 border-amber-400/30 text-amber-300'
                    : 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                }`}
              >
                <Gauge className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase block">
                  Heads-Up Driver Safety Status
                </span>
                <h3 className="text-xl font-black tracking-tight uppercase">
                  {currentResult.riskLevel === 'safe'
                    ? '🟢 Safe Driving Conditions'
                    : currentResult.riskLevel === 'moderate'
                    ? '🟡 Moderate Fatigue Warning'
                    : '🔴 Severe Hazard: Microsleep / Distress Detected'}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-300 block">Fatigue Index</span>
              <span className="text-3xl font-black font-mono">
                {currentResult.fatigueIndex}<span className="text-base text-slate-400">/100</span>
              </span>
            </div>
          </div>

          {/* Gemini Early Warning Box */}
          <div className="my-4 p-4 rounded-xl bg-black/40 border border-white/10 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Gemini Driver Safety Intelligence Warning</span>
            </div>
            <p className="text-slate-100 text-sm font-semibold">
              {currentResult.geminiWarning}
            </p>
            <p className="text-cyan-200 text-xs font-mono">
              Action: {currentResult.suggestedAction}
            </p>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">Heart Rate</span>
              <span className="font-mono text-lg font-bold text-white">
                {currentResult.heartRate} <span className="text-xs font-normal text-slate-400">bpm</span>
              </span>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">HRV Autonomic</span>
              <span className="font-mono text-lg font-bold text-white">
                {currentResult.heartRateVariability} <span className="text-xs font-normal text-slate-400">ms</span>
              </span>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">Blink Rate</span>
              <span className="font-mono text-lg font-bold text-white">
                {currentResult.blinkFrequencyPerMin} <span className="text-xs font-normal text-slate-400">/min</span>
              </span>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">PERCLOS Eye Closure</span>
              <span className="font-mono text-lg font-bold text-white">
                {currentResult.eyeClosureDurationMs} <span className="text-xs font-normal text-slate-400">ms</span>
              </span>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">Steering Stability</span>
              <span className="font-mono text-lg font-bold text-white">
                {currentResult.steeringStability}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* History Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Vehicle Health & Safety Log History ({history.length})
          </h4>
          <span className="text-xs text-slate-500">
            Recorded in real-time by IoT Driver Pod
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {history.map((row) => (
            <div key={row.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      row.riskLevel === 'safe'
                        ? 'bg-emerald-100 text-emerald-800'
                        : row.riskLevel === 'moderate'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {row.riskLevel}
                  </span>
                  <span className="font-semibold text-slate-800">{row.geminiWarning}</span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  HR: {row.heartRate} bpm | HRV: {row.heartRateVariability}ms | Eye Closure: {row.eyeClosureDurationMs}ms | Steering: {row.steeringStability}%
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400 font-mono">
                {new Date(row.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
