import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  HeartPulse,
  Activity,
  Video,
  X,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  CheckCircle2,
  Stethoscope,
  RefreshCw
} from 'lucide-react';
import { IoTReading } from '../../types';

export interface VitalAnomalyItem {
  key: string;
  label: string;
  measuredValue: string;
  normalRange: string;
  deviationText: string;
  severity: 'warning' | 'critical';
}

interface EmergencyVitalFloatingAlertProps {
  reading?: IoTReading | null;
  liveSimVitals?: {
    heartRate: number;
    systolicBp: number;
    diastolicBp: number;
    spO2: number;
    temperature: number;
    glucose: number;
  };
  patientName?: string;
  assignedDoctorName?: string;
  targetHospitalName?: string;
  sosLoading?: boolean;
  onTriggerEmergencySOS: () => void;
  onStartUrgentVirtualVisit: (anomaliesSummary: string) => void;
  onOpenIoTKitTab: () => void;
}

export function detectVitalSignAnomalies(source?: {
  heartRate: number;
  systolicBp: number;
  diastolicBp: number;
  spO2: number;
  temperature: number;
  glucose: number;
} | null): VitalAnomalyItem[] {
  if (!source) return [];
  const anomalies: VitalAnomalyItem[] = [];

  // 1. Heart Rate (Normal: 60 - 100 bpm)
  if (source.heartRate < 60 || source.heartRate > 100) {
    const isCrit = source.heartRate < 50 || source.heartRate > 120;
    const diff = source.heartRate < 60 ? 60 - source.heartRate : source.heartRate - 100;
    anomalies.push({
      key: 'heartRate',
      label: 'Heart Rate',
      measuredValue: `${source.heartRate} bpm`,
      normalRange: '60–100 bpm',
      deviationText:
        source.heartRate < 60
          ? `Bradycardia (-${diff} bpm below normal)`
          : `Tachycardia (+${diff} bpm above normal)`,
      severity: isCrit ? 'critical' : 'warning',
    });
  }

  // 2. Blood Pressure (Normal: 90–120 / 60–80 mmHg)
  if (
    source.systolicBp > 130 ||
    source.systolicBp < 90 ||
    source.diastolicBp > 85 ||
    source.diastolicBp < 60
  ) {
    const isCrit =
      source.systolicBp >= 180 ||
      source.systolicBp < 80 ||
      source.diastolicBp >= 115 ||
      source.diastolicBp < 50;
    anomalies.push({
      key: 'bloodPressure',
      label: 'Blood Pressure',
      measuredValue: `${source.systolicBp}/${source.diastolicBp} mmHg`,
      normalRange: '90–120 / 60–80 mmHg',
      deviationText:
        source.systolicBp >= 180 || source.diastolicBp >= 115
          ? 'Hypertensive Crisis Threshold Exceeded'
          : source.systolicBp < 90
          ? 'Hypotensive Low Arterial Pressure'
          : 'Elevated Arterial Blood Pressure',
      severity: isCrit ? 'critical' : 'warning',
    });
  }

  // 3. SpO2 Blood Oxygen (Normal: 95 - 100%)
  if (source.spO2 < 95) {
    const isCrit = source.spO2 < 92;
    anomalies.push({
      key: 'spO2',
      label: 'SpO₂ Oxygen',
      measuredValue: `${source.spO2}%`,
      normalRange: '95–100%',
      deviationText: isCrit
        ? `Acute Hypoxemia (-${95 - source.spO2}% below baseline)`
        : `Mild Desaturation (-${95 - source.spO2}% below normal)`,
      severity: isCrit ? 'critical' : 'warning',
    });
  }

  // 4. Core Temperature (Normal: 36.1 - 37.2 °C)
  if (source.temperature > 37.5 || source.temperature < 35.8) {
    const isCrit = source.temperature >= 38.8 || source.temperature < 35.0;
    anomalies.push({
      key: 'temperature',
      label: 'Core Temp',
      measuredValue: `${source.temperature.toFixed(1)} °C`,
      normalRange: '36.1–37.2 °C',
      deviationText:
        source.temperature > 37.5
          ? `Febrile Spike (+${(source.temperature - 37.2).toFixed(1)} °C)`
          : `Hypothermic Drop (${(source.temperature - 36.1).toFixed(1)} °C)`,
      severity: isCrit ? 'critical' : 'warning',
    });
  }

  // 5. Blood Glucose (Normal: 70 - 140 mg/dL)
  if (source.glucose < 70 || source.glucose > 140) {
    const isCrit = source.glucose < 55 || source.glucose >= 240;
    anomalies.push({
      key: 'glucose',
      label: 'Blood Glucose',
      measuredValue: `${source.glucose} mg/dL`,
      normalRange: '70–140 mg/dL',
      deviationText:
        source.glucose < 70
          ? `Hypoglycemia (-${70 - source.glucose} mg/dL below normal)`
          : `Hyperglycemia (+${source.glucose - 140} mg/dL above normal)`,
      severity: isCrit ? 'critical' : 'warning',
    });
  }

  return anomalies;
}

export const EmergencyVitalFloatingAlert: React.FC<EmergencyVitalFloatingAlertProps> = ({
  reading,
  liveSimVitals,
  patientName = 'Patient',
  assignedDoctorName,
  targetHospitalName = '24/7 Trauma & Emergency Center',
  sosLoading = false,
  onTriggerEmergencySOS,
  onStartUrgentVirtualVisit,
  onOpenIoTKitTab,
}) => {
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Determine active telemetry source: if live simulator vitals are out of range, prioritize them; otherwise evaluate latest recorded IoT kit reading
  const simAnomalies = useMemo(() => detectVitalSignAnomalies(liveSimVitals || null), [liveSimVitals]);
  const readingAnomalies = useMemo(() => detectVitalSignAnomalies(reading || null), [reading]);

  const activeAnomalies = simAnomalies.length > 0 ? simAnomalies : readingAnomalies;
  const isFromSimulator = simAnomalies.length > 0;

  const overallSeverity: 'critical' | 'warning' | 'normal' = useMemo(() => {
    if (activeAnomalies.length === 0) return 'normal';
    if (
      activeAnomalies.some((a) => a.severity === 'critical') ||
      (!isFromSimulator && reading?.status === 'critical')
    ) {
      return 'critical';
    }
    return 'warning';
  }, [activeAnomalies, isFromSimulator, reading?.status]);

  // Unique signature so that if vitals change to a new abnormal state, the floating alert re-triggers automatically
  const anomalySignature = useMemo(() => {
    if (activeAnomalies.length === 0) return '';
    return activeAnomalies.map((a) => `${a.key}:${a.measuredValue}`).join('|');
  }, [activeAnomalies]);

  // Synthesize a brief clinical alert tone when soundEnabled is toggled on
  useEffect(() => {
    if (!soundEnabled || activeAnomalies.length === 0 || dismissedSignature === anomalySignature) {
      return;
    }
    const playClinicalTone = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = overallSeverity === 'critical' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(overallSeverity === 'critical' ? 880 : 660, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        setTimeout(() => {
          try {
            ctx.close();
          } catch {}
        }, 450);
      } catch {
        // Ignore audio errors
      }
    };

    playClinicalTone();
    const interval = setInterval(playClinicalTone, overallSeverity === 'critical' ? 4000 : 7000);
    return () => clearInterval(interval);
  }, [soundEnabled, activeAnomalies.length, dismissedSignature, anomalySignature, overallSeverity]);

  if (activeAnomalies.length === 0 || dismissedSignature === anomalySignature) {
    return null;
  }

  const isCritical = overallSeverity === 'critical';
  const anomaliesSummaryText = activeAnomalies
    .map((a) => `${a.label}: ${a.measuredValue} (${a.deviationText})`)
    .join('; ');

  // Minimized Floating Pill Bar
  if (isMinimized) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-white transition-all cursor-pointer ${
          isCritical
            ? 'bg-red-700 border-red-400 hover:bg-red-800'
            : 'bg-amber-600 border-amber-400 hover:bg-amber-700'
        }`}
        onClick={() => setIsMinimized(false)}
      >
        <AlertOctagon className="w-5 h-5 shrink-0" />
        <div className="text-xs">
          <span className="font-extrabold block">
            {isCritical ? 'CRITICAL IOT VITAL ALERT' : 'ABNORMAL IOT VITALS DETECTED'}
          </span>
          <span className="font-mono tabular-nums text-[11px] opacity-90">
            {activeAnomalies.length} Vital Sign{activeAnomalies.length > 1 ? 's' : ''} Out of Normal Range
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
          title="Expand Emergency Alert"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-md rounded-2xl shadow-2xl border overflow-hidden transition-all duration-200 bg-white border-slate-200"
    >
      {/* Top High-Priority Alert Banner */}
      <div
        className={`px-4 py-3.5 text-white flex items-start justify-between gap-3 ${
          isCritical ? 'bg-red-700' : 'bg-amber-600'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-white/15 border border-white/25 shrink-0 mt-0.5">
            {isCritical ? (
              <AlertOctagon className="w-5 h-5 text-white" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/90">
              <span>{isCritical ? 'HIGH-PRIORITY EMERGENCY ALERT' : 'IOT TELEMETRY WARNING'}</span>
              <span>·</span>
              <span>{isFromSimulator ? 'LIVE SENSOR STREAM' : 'RECORDED KIT TELEMETRY'}</span>
            </div>
            <h4 className="text-sm font-extrabold tracking-tight text-white mt-0.5">
              {isCritical
                ? 'Critical Vital Signs Outside Safe Thresholds'
                : 'Abnormal IoT Vital Signs Detected'}
            </h4>
          </div>
        </div>

        {/* Audio Mute / Minimize / Dismiss Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute clinical alarm tone' : 'Enable audible clinical alarm tone'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Minimize alert to corner"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(false);
              setDismissedSignature(anomalySignature);
            }}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Acknowledge & Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3.5 text-xs bg-white">
        <div className="flex items-center justify-between text-[11px] text-slate-600 pb-2 border-b border-slate-100">
          <span>
            Patient: <strong className="text-slate-900">{patientName}</strong>
          </span>
          <span className="font-mono tabular-nums text-slate-500">
            {activeAnomalies.length} Abnormal Parameter{activeAnomalies.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Out-of-Range Vitals Table */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {activeAnomalies.map((item) => (
            <div
              key={item.key}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                item.severity === 'critical'
                  ? 'bg-red-50/70 border-red-200 text-red-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <HeartPulse
                    className={`w-3.5 h-3.5 shrink-0 ${
                      item.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  />
                  <span className="font-bold text-slate-900">{item.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                    (Normal: {item.normalRange})
                  </span>
                </div>
                <p
                  className={`text-[11px] font-medium mt-0.5 ${
                    item.severity === 'critical' ? 'text-red-700' : 'text-amber-800'
                  }`}
                >
                  {item.deviationText}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`font-mono tabular-nums text-sm font-black block ${
                    item.severity === 'critical' ? 'text-red-700' : 'text-amber-800'
                  }`}
                >
                  {item.measuredValue}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {item.severity}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Clinical Routing Info */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between gap-2">
          <div className="truncate">
            <span>ER Target: </span>
            <strong className="text-slate-900">{targetHospitalName}</strong>
            {assignedDoctorName ? (
              <span> · Dr. {assignedDoctorName}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onOpenIoTKitTab}
            className="text-teal-700 hover:text-teal-900 font-bold underline shrink-0 cursor-pointer"
          >
            Recalibrate Kit
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onTriggerEmergencySOS}
            disabled={sosLoading}
            className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {sosLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            )}
            <span>{sosLoading ? 'Dispatching SOS...' : 'Dispatch Emergency SOS'}</span>
          </button>

          <button
            type="button"
            onClick={() => onStartUrgentVirtualVisit(anomaliesSummaryText)}
            className="w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>Urgent Virtual Visit</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-400">
            IoT Bluetooth 5.3 Continuous Threshold Monitor
          </span>
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(false);
              setDismissedSignature(anomalySignature);
            }}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acknowledge & Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
};
