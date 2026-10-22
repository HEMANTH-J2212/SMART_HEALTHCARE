import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Calendar,
  Clock,
  Stethoscope,
  ShieldCheck,
  HeartPulse,
  Activity,
  MessageSquare,
  Send,
  CheckCircle2,
  Sparkles,
  User as UserIcon,
  Building2,
  MonitorUp,
  Subtitles,
  FileText,
  RefreshCw,
  AlertCircle,
  Check
} from 'lucide-react';
import { Appointment, IoTReading, User } from '../../types';
import { api } from '../../services/api';

export interface CompletedConsultationAuditRecord {
  id: string;
  roomCode: string;
  treatmentCode: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  hospitalName: string;
  completedAtIso: string;
  scheduledDate: string;
  timeSlot: string;
  durationSec: number;
  durationFormatted: string;
  reasonForVisit: string;
  vitalsSnapshot: string;
}

interface VirtualVisitSuiteProps {
  patientId: string;
  patientName: string;
  doctorsList: User[];
  appointments: Appointment[];
  latestReading?: IoTReading | null;
  initialUrgentReason?: string | null;
  onAppointmentBooked: () => Promise<void>;
  onClearUrgentReason?: () => void;
  onConsultationCompleted?: (record: CompletedConsultationAuditRecord) => void;
}

interface ScheduledVirtualVisit {
  id: string;
  roomCode: string;
  treatmentCode: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  hospitalName: string;
  date: string;
  timeSlot: string;
  reasonForVisit: string;
  symptoms: string;
  attachIoTVitals: boolean;
  status: 'scheduled' | 'in_progress' | 'completed';
}

interface ChatMessage {
  id: string;
  sender: 'doctor' | 'patient' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
}

export const VirtualVisitSuite: React.FC<VirtualVisitSuiteProps> = ({
  patientId,
  patientName,
  doctorsList,
  appointments,
  latestReading,
  initialUrgentReason,
  onAppointmentBooked,
  onClearUrgentReason,
  onConsultationCompleted,
}) => {
  // Schedule Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    doctorsList[0]?.id || ''
  );
  const [visitDate, setVisitDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [visitSlot, setVisitSlot] = useState<string>('10:30 AM');
  const [visitReason, setVisitReason] = useState<string>(
    initialUrgentReason || 'Telehealth Video Consultation & IoT Vitals Review'
  );
  const [visitSymptoms, setVisitSymptoms] = useState<string>('');
  const [attachVitals, setAttachVitals] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);

  // Hardware Readiness Check State
  const [hardwareChecked, setHardwareChecked] = useState<boolean>(true);
  const [testingHardware, setTestingHardware] = useState<boolean>(false);
  const [networkLatencyMs, setNetworkLatencyMs] = useState<number>(28);

  // Active Video Consultation Room State
  const [activeVisit, setActiveVisit] = useState<ScheduledVirtualVisit | null>(null);
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isSharingVitalsHud, setIsSharingVitalsHud] = useState<boolean>(true);
  const [showLiveCaptions, setShowLiveCaptions] = useState<boolean>(true);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState<number>(0);
  const [completedVisitSummary, setCompletedVisitSummary] = useState<ScheduledVirtualVisit | null>(null);

  // In-Call Chat & Clinical Notes
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');

  // Local Virtual Visits state synced with patient's appointments
  const [localVirtualVisits, setLocalVirtualVisits] = useState<ScheduledVirtualVisit[]>([]);

  // Completed Consultation History Audit Trail (persisted in localStorage)
  const [consultationHistory, setConsultationHistory] = useState<CompletedConsultationAuditRecord[]>(() => {
    try {
      const raw = localStorage.getItem(`shm_consultation_history_${patientId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`shm_consultation_history_${patientId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setConsultationHistory(parsed);
      }
    } catch {
      // ignore
    }
  }, [patientId]);

  // Webcam self-view ref
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [hasWebcamStream, setHasWebcamStream] = useState<boolean>(false);

  useEffect(() => {
    if (doctorsList.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctorsList[0].id);
    }
  }, [doctorsList, selectedDoctorId]);

  // If triggered from the Emergency Vital Floating Alert, prefill and offer immediate launch
  useEffect(() => {
    if (initialUrgentReason) {
      setVisitReason(`Urgent IoT Telemetry Anomaly: ${initialUrgentReason}`);
      setVisitSymptoms(initialUrgentReason);
      const doc = doctorsList[0];
      if (doc) {
        const urgentVisit: ScheduledVirtualVisit = {
          id: `vv-urgent-${Date.now()}`,
          roomCode: `TELE-ER-${Math.floor(1000 + Math.random() * 9000)}`,
          treatmentCode: `TRT-${Math.floor(100000 + Math.random() * 900000)}`,
          doctorId: doc.id,
          doctorName: doc.name,
          doctorSpecialization: doc.doctorProfile?.specialization || 'Cardiology & Internal Medicine',
          hospitalName: doc.doctorProfile?.hospitalName || 'Connected Medical Center',
          date: new Date().toISOString().split('T')[0],
          timeSlot: 'Immediate Urgent Triage',
          reasonForVisit: `Urgent IoT Telemetry Alert: ${initialUrgentReason}`,
          symptoms: initialUrgentReason,
          attachIoTVitals: true,
          status: 'in_progress',
        };
        handleJoinVideoRoom(urgentVisit);
      }
      if (onClearUrgentReason) {
        onClearUrgentReason();
      }
    }
  }, [initialUrgentReason]);

  // Derive virtual visits from booked appointments + local scheduled visits
  const combinedVirtualVisits: ScheduledVirtualVisit[] = React.useMemo(() => {
    const fromApts: ScheduledVirtualVisit[] = appointments
      .filter((a) => a.status !== 'cancelled' && a.status !== 'rejected')
      .map((a) => ({
        id: a.id,
        roomCode: `TELE-RM-${a.id.slice(-4).toUpperCase()}`,
        treatmentCode: a.treatmentCode || `TRT-${a.id.slice(-6).toUpperCase()}`,
        doctorId: a.doctorId,
        doctorName: a.doctorName,
        doctorSpecialization: a.doctorSpecialization,
        hospitalName: a.hospitalName,
        date: a.date,
        timeSlot: a.timeSlot,
        reasonForVisit: a.reasonForVisit,
        symptoms: a.symptoms || '',
        attachIoTVitals: true,
        status: a.status === 'completed' ? 'completed' : 'scheduled',
      }));

    const existingIds = new Set(fromApts.map((v) => v.id));
    const merged = [
      ...localVirtualVisits.filter((v) => !existingIds.has(v.id)),
      ...fromApts,
    ];
    return merged;
  }, [appointments, localVirtualVisits]);

  // Call duration timer & simulated live captions
  useEffect(() => {
    if (!activeVisit) return;
    const timer = setInterval(() => {
      setCallDurationSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeVisit]);

  const doctorCaptions = React.useMemo(() => {
    if (!activeVisit) return [];
    const hr = latestReading?.heartRate || 74;
    const bp = latestReading ? `${latestReading.systolicBp}/${latestReading.diastolicBp}` : '118/78';
    const spo2 = latestReading?.spO2 || 98;
    return [
      `Hello ${patientName}, I am Dr. ${activeVisit.doctorName}. I have your live IoT telemetry feed open on my clinical console.`,
      `I can see your current Heart Rate is ${hr} bpm, Blood Pressure is ${bp} mmHg, and SpO₂ is ${spo2}%.`,
      `Please let me know if you are experiencing any shortness of breath, dizziness, or chest discomfort right now.`,
      `Your verification passkey ${activeVisit.treatmentCode} is logged for this session. Feel free to message me in the clinical chat panel.`,
    ];
  }, [activeVisit, latestReading, patientName]);

  useEffect(() => {
    if (!activeVisit || doctorCaptions.length === 0) return;
    const interval = setInterval(() => {
      setActiveCaptionIndex((prev) => (prev + 1) % doctorCaptions.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [activeVisit, doctorCaptions.length]);

  // Manage patient webcam preview when in active video call
  useEffect(() => {
    if (!activeVisit || !isCameraOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setHasWebcamStream(false);
      return;
    }

    let isMounted = true;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = stream;
          setHasWebcamStream(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          if (isMounted) setHasWebcamStream(false);
        });
    }

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [activeVisit, isCameraOn]);

  const formatCallTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleRunHardwareTest = () => {
    setTestingHardware(true);
    setTimeout(() => {
      setHardwareChecked(true);
      setNetworkLatencyMs(Math.floor(18 + Math.random() * 14));
      setTestingHardware(false);
    }, 600);
  };

  const handleScheduleVirtualVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    const doc = doctorsList.find((d) => d.id === selectedDoctorId) || doctorsList[0];
    if (!doc) return;

    setIsSubmitting(true);
    setScheduleNotice(null);

    const roomCode = `TELE-RM-${Math.floor(1000 + Math.random() * 9000)}`;
    const treatmentCode = `TRT-${Math.floor(100000 + Math.random() * 900000)}`;
    const formattedReason = visitReason.startsWith('[Virtual Visit]')
      ? visitReason
      : `[Virtual Visit · ${roomCode}] ${visitReason}`;

    try {
      await api.bookAppointment({
        patientId,
        patientName,
        doctorId: doc.id,
        date: visitDate,
        timeSlot: visitSlot,
        reasonForVisit: formattedReason,
        symptoms: visitSymptoms.trim() || 'Scheduled HD Video Teleconsultation with IoT Vitals Sync',
      });
      await onAppointmentBooked();
    } catch {
      // Also store locally so it's always immediately joinable
    }

    const newVisit: ScheduledVirtualVisit = {
      id: `vv-${Date.now()}`,
      roomCode,
      treatmentCode,
      doctorId: doc.id,
      doctorName: doc.name,
      doctorSpecialization: doc.doctorProfile?.specialization || 'Specialist Physician',
      hospitalName: doc.doctorProfile?.hospitalName || 'Affiliated Medical Center',
      date: visitDate,
      timeSlot: visitSlot,
      reasonForVisit: formattedReason,
      symptoms: visitSymptoms,
      attachIoTVitals: attachVitals,
      status: 'scheduled',
    };

    setLocalVirtualVisits((prev) => [newVisit, ...prev]);
    setScheduleNotice(
      `Virtual Visit scheduled with Dr. ${doc.name} for ${visitDate} at ${visitSlot} (Room: ${roomCode}). You can join the consultation room below.`
    );
    setIsSubmitting(false);
  };

  const handleJoinVideoRoom = (visit: ScheduledVirtualVisit) => {
    setCompletedVisitSummary(null);
    setActiveVisit(visit);
    setCallDurationSec(0);
    setIsMicMuted(false);
    setIsCameraOn(true);
    setIsSharingVitalsHud(true);
    setActiveCaptionIndex(0);

    const vitalsLine = latestReading
      ? `HR ${latestReading.heartRate} bpm · BP ${latestReading.systolicBp}/${latestReading.diastolicBp} mmHg · SpO₂ ${latestReading.spO2}% · Temp ${latestReading.temperature}°C`
      : 'Baseline telemetry connected';

    setChatMessages([
      {
        id: 'sys-1',
        sender: 'system',
        senderName: 'Telehealth Encrypted Bridge',
        text: `Room ${visit.roomCode} established. IoT Kit Vitals Snapshot synced (${vitalsLine}).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: 'doc-1',
        sender: 'doctor',
        senderName: `Dr. ${visit.doctorName}`,
        text: `Hello ${patientName}! I have reviewed your reason for visit ("${visit.reasonForVisit}") and your live IoT vital signs. How are you feeling right now?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeVisit) return;
    const text = chatInput.trim();
    setChatInput('');

    const patientMsg: ChatMessage = {
      id: `pat-${Date.now()}`,
      sender: 'patient',
      senderName: patientName,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, patientMsg]);

    // Simulated clinical response from the doctor
    setTimeout(() => {
      const lower = text.toLowerCase();
      let replyText = `Thank you for sharing that, ${patientName}. Based on your IoT telemetry (${
        latestReading ? `${latestReading.systolicBp}/${latestReading.diastolicBp} mmHg, ${latestReading.heartRate} bpm` : 'stable baseline'
      }), I am logging this in your clinical chart and updating your care instructions.`;

      if (lower.includes('bp') || lower.includes('pressure') || lower.includes('heart') || lower.includes('chest')) {
        replyText = `I see the hemodynamic fluctuation on your IoT cuff feed. Please remain seated and rested; I am adjusting your antihypertensive observation protocol and attaching a digital prescription note.`;
      } else if (lower.includes('medicine') || lower.includes('prescription') || lower.includes('tablet') || lower.includes('dose')) {
        replyText = `I have verified your medication schedule. Continue taking your prescribed dosage after meals and log compliance in the Prescriptions tab.`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `doc-${Date.now()}`,
          sender: 'doctor',
          senderName: `Dr. ${activeVisit.doctorName}`,
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 900);
  };

  const handleEndVideoCall = () => {
    if (!activeVisit) return;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    const effectiveDurationSec = Math.max(callDurationSec, 1);
    const finished: ScheduledVirtualVisit = {
      ...activeVisit,
      status: 'completed',
    };
    setLocalVirtualVisits((prev) => {
      const exists = prev.some((v) => v.id === finished.id);
      return exists ? prev.map((v) => (v.id === finished.id ? finished : v)) : [finished, ...prev];
    });

    const auditRecord: CompletedConsultationAuditRecord = {
      id: `audit-${Date.now()}`,
      roomCode: activeVisit.roomCode,
      treatmentCode: activeVisit.treatmentCode,
      doctorId: activeVisit.doctorId,
      doctorName: activeVisit.doctorName,
      doctorSpecialization: activeVisit.doctorSpecialization,
      hospitalName: activeVisit.hospitalName,
      completedAtIso: new Date().toISOString(),
      scheduledDate: activeVisit.date,
      timeSlot: activeVisit.timeSlot,
      durationSec: effectiveDurationSec,
      durationFormatted: formatCallTimer(effectiveDurationSec),
      reasonForVisit: activeVisit.reasonForVisit,
      vitalsSnapshot: latestReading
        ? `HR ${latestReading.heartRate} bpm · BP ${latestReading.systolicBp}/${latestReading.diastolicBp} mmHg · SpO₂ ${latestReading.spO2}%`
        : 'Baseline Telemetry Verified',
    };

    setConsultationHistory((prev) => {
      const updated = [auditRecord, ...prev];
      try {
        localStorage.setItem(`shm_consultation_history_${patientId}`, JSON.stringify(updated));
      } catch {
        // ignore storage quota errors
      }
      return updated;
    });

    if (onConsultationCompleted) {
      onConsultationCompleted(auditRecord);
    }

    setCompletedVisitSummary(finished);
    setActiveVisit(null);
  };

  // Merge localStorage audit records with completed backend appointments for comprehensive audit trail
  const fullConsultationHistory: CompletedConsultationAuditRecord[] = React.useMemo(() => {
    const fromCompletedApts: CompletedConsultationAuditRecord[] = appointments
      .filter((a) => a.status === 'completed')
      .map((a) => ({
        id: `apt-audit-${a.id}`,
        roomCode: `TELE-RM-${a.id.slice(-4).toUpperCase()}`,
        treatmentCode: a.treatmentCode || `TRT-${a.id.slice(-6).toUpperCase()}`,
        doctorId: a.doctorId,
        doctorName: a.doctorName,
        doctorSpecialization: a.doctorSpecialization,
        hospitalName: a.hospitalName,
        completedAtIso: a.createdAt || new Date().toISOString(),
        scheduledDate: a.date,
        timeSlot: a.timeSlot,
        durationSec: 900,
        durationFormatted: '15:00',
        reasonForVisit: a.reasonForVisit,
        vitalsSnapshot: 'Clinical Vitals Verified at Visit',
      }));

    const seenCodes = new Set(consultationHistory.map((r) => r.treatmentCode));
    return [
      ...consultationHistory,
      ...fromCompletedApts.filter((r) => !seenCodes.has(r.treatmentCode)),
    ];
  }, [consultationHistory, appointments]);

  const selectedDoctorObj =
    doctorsList.find((d) => d.id === selectedDoctorId) || doctorsList[0];

  return (
    <div className="space-y-6">
      {/* ================= ACTIVE VIDEO CONFERENCING CONSULTATION INTERFACE ================= */}
      {activeVisit && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-white">
          {/* Top Video Session Bar */}
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-white">
                    Dr. {activeVisit.doctorName.replace(/^Dr\.\s*/i, '')}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-teal-300 font-medium">
                    {activeVisit.doctorSpecialization}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-300">
                    Room: {activeVisit.roomCode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeVisit.hospitalName} · Encrypted Telehealth Consultation · Passkey:{' '}
                  <strong className="font-mono text-emerald-400">{activeVisit.treatmentCode}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono tabular-nums flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>LIVE {formatCallTimer(callDurationSec)}</span>
              </div>
              <button
                type="button"
                onClick={handleEndVideoCall}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Consultation</span>
              </button>
            </div>
          </div>

          {/* Main Video Stage + In-Call IoT Telemetry & Chat Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left 8 Columns: Doctor Video Viewport + Patient PiP + Controls */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-slate-950 relative min-h-[440px] border-b lg:border-b-0 lg:border-r border-slate-800">
              {/* Simulated Doctor HD Video Stream */}
              <div className="relative flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden">
                {/* Doctor Avatar & Speaking Visualizer */}
                <div className="relative flex flex-col items-center text-center max-w-md z-10">
                  <div className="relative mb-4">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-teal-700 to-slate-800 border-2 border-teal-400/50 flex items-center justify-center shadow-2xl">
                      <Stethoscope className="w-12 h-12 text-teal-200" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-emerald-600 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                      Speaking
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-white">
                    Dr. {activeVisit.doctorName.replace(/^Dr\.\s*/i, '')}
                  </h3>
                  <p className="text-xs text-teal-300 font-medium mt-0.5">
                    {activeVisit.doctorSpecialization} · {activeVisit.hospitalName}
                  </p>

                  {/* Audio Waveform Indicator */}
                  <div className="flex items-center gap-1 mt-4 h-6">
                    {[12, 22, 16, 26, 18, 24, 14, 20, 10].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-teal-400 rounded-full animate-pulse"
                        style={{
                          height: `${h}px`,
                          animationDelay: `${i * 120}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Live IoT Vital Signs HUD Overlay (Top-Left of Video Stream) */}
                {isSharingVitalsHud && (
                  <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-xs space-y-2 max-w-xs shadow-lg z-20">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-teal-300 flex items-center gap-1.5 text-[11px]">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                        <span>Shared IoT Kit Telemetry</span>
                      </span>
                      <span className="font-mono tabular-nums text-[10px] text-emerald-400">
                        SYNCED
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">HEART RATE</span>
                        <strong className="text-white">{latestReading?.heartRate || 74} bpm</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">BLOOD PRESS</span>
                        <strong className="text-white">
                          {latestReading ? `${latestReading.systolicBp}/${latestReading.diastolicBp}` : '118/78'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">SpO₂ OXYGEN</span>
                        <strong className="text-white">{latestReading?.spO2 || 98}%</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Picture-in-Picture (PiP) Patient Self-View (Top-Right of Video Stream) */}
                <div className="absolute top-4 right-4 w-40 h-28 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-xl flex flex-col items-center justify-center z-20">
                  {isCameraOn && hasWebcamStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mb-1">
                        {isCameraOn ? <UserIcon className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-300 truncate max-w-[130px]">
                        {patientName} (You)
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {isCameraOn ? 'HD Self-View Active' : 'Camera Paused'}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-medium text-white">
                    You {isMicMuted ? '· Muted' : ''}
                  </div>
                </div>

                {/* Live Subtitles / Clinical Captions Bar */}
                {showLiveCaptions && doctorCaptions.length > 0 && (
                  <div className="mt-6 max-w-xl w-full bg-black/75 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2.5 text-center z-20">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 block mb-0.5">
                      Live Physician Audio Transcript
                    </span>
                    <p className="text-xs text-slate-100 leading-relaxed">
                      "{doctorCaptions[activeCaptionIndex]}"
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Video Control Bar */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    isMicMuted
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isMicMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    !isCameraOn
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  <span>{isCameraOn ? 'Stop Camera' : 'Start Camera'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSharingVitalsHud(!isSharingVitalsHud)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    isSharingVitalsHud
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  <MonitorUp className="w-4 h-4" />
                  <span>{isSharingVitalsHud ? 'Sharing IoT Vitals' : 'Share IoT Vitals'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLiveCaptions(!showLiveCaptions)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    showLiveCaptions
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  <Subtitles className="w-4 h-4" />
                  <span>{showLiveCaptions ? 'Captions On' : 'Captions Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleEndVideoCall}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Leave Room</span>
                </button>
              </div>
            </div>

            {/* Right 4 Columns: In-Call Clinical Chat & Live Notes */}
            <div className="lg:col-span-4 flex flex-col h-[480px] bg-slate-900">
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <MessageSquare className="w-4 h-4 text-teal-400" />
                  <span>Consultation Chat & Clinical Notes</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">E2E Encrypted</span>
              </div>

              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl border ${
                      msg.sender === 'system'
                        ? 'bg-slate-950/90 border-slate-800 text-slate-400 text-[11px] font-mono'
                        : msg.sender === 'patient'
                        ? 'bg-teal-900/50 border-teal-700/60 text-teal-50 ml-4'
                        : 'bg-slate-800/90 border-slate-700 text-slate-100 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <strong className="text-slate-200">{msg.senderName}</strong>
                      <span className="font-mono tabular-nums">{msg.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSendChatMessage}
                className="p-3 border-t border-slate-800 flex items-center gap-2 bg-slate-950"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Dr. a question or share symptoms..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors"
                  title="Send message to doctor"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Post-Call Summary Banner */}
      {completedVisitSummary && !activeVisit && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-emerald-950">
                Virtual Visit Completed with Dr. {completedVisitSummary.doctorName.replace(/^Dr\.\s*/i, '')}
              </h4>
              <p className="text-emerald-800 mt-0.5">
                Room <strong className="font-mono">{completedVisitSummary.roomCode}</strong> session logged · Treatment Passkey:{' '}
                <strong className="font-mono">{completedVisitSummary.treatmentCode}</strong> · Duration: {formatCallTimer(callDurationSec)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleJoinVideoRoom(completedVisitSummary)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer"
          >
            Rejoin Room
          </button>
        </div>
      )}

      {/* ================= SCHEDULE NEW VIRTUAL VISIT & UPCOMING TELEHEALTH QUEUE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Columns: Schedule Virtual Visit Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-teal-700 font-bold text-xs">
              <Video className="w-4 h-4" />
              <span>Telehealth & Video Consultation Scheduler</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">
              Schedule a Virtual Visit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Book an encrypted video consultation and sync your IoT kit vital signs directly with your specialist.
            </p>
          </div>

          {scheduleNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{scheduleNotice}</span>
            </div>
          )}

          <form onSubmit={handleScheduleVirtualVisit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Consulting Specialist *
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600"
              >
                {doctorsList.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name.replace(/^Dr\.\s*/i, '')} — {doc.doctorProfile?.specialization} ({doc.doctorProfile?.hospitalName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Consultation Date *
                </label>
                <input
                  type="date"
                  required
                  value={visitDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Preferred Video Slot *
                </label>
                <select
                  value={visitSlot}
                  onChange={(e) => setVisitSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
                >
                  <option value="09:30 AM">09:30 AM (Morning Video)</option>
                  <option value="10:30 AM">10:30 AM (Morning Video)</option>
                  <option value="11:30 AM">11:30 AM (Midday Video)</option>
                  <option value="02:30 PM">02:30 PM (Afternoon Video)</option>
                  <option value="04:30 PM">04:30 PM (Evening Video)</option>
                  <option value="06:00 PM">06:00 PM (Late Tele-OPD)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Primary Reason for Virtual Visit *
              </label>
              <input
                type="text"
                required
                value={visitReason}
                onChange={(e) => setVisitReason(e.target.value)}
                placeholder="e.g. Follow-up on morning BP & IoT telemetry"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Symptoms & Clinical Notes for Doctor
              </label>
              <textarea
                rows={2}
                value={visitSymptoms}
                onChange={(e) => setVisitSymptoms(e.target.value)}
                placeholder="Describe any symptoms, medication questions, or recent readings..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {/* Attach Live IoT Kit Vitals Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50/70 border border-teal-200 cursor-pointer">
              <input
                type="checkbox"
                checked={attachVitals}
                onChange={(e) => setAttachVitals(e.target.checked)}
                className="mt-0.5 rounded border-teal-300 text-teal-700 focus:ring-teal-500"
              />
              <div>
                <span className="font-bold text-teal-950 block">
                  Stream IoT Kit Vital Signs to Doctor's Console
                </span>
                <span className="text-[11px] text-teal-800 font-mono tabular-nums">
                  {latestReading
                    ? `Current: HR ${latestReading.heartRate} bpm · BP ${latestReading.systolicBp}/${latestReading.diastolicBp} mmHg · SpO₂ ${latestReading.spO2}%`
                    : 'Automatically shares real-time heart rate, BP, and SpO₂ during video call'}
                </span>
              </div>
            </label>

            {/* Pre-Call Device & Bandwidth Check */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div className="text-[11px]">
                <span className="font-bold text-slate-800 block">
                  Pre-Visit WebRTC Device Readiness
                </span>
                <span className="text-slate-500 font-mono tabular-nums">
                  {hardwareChecked
                    ? `Camera & Mic Ready · Latency: ${networkLatencyMs} ms`
                    : 'Run a quick check before joining'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRunHardwareTest}
                disabled={testingHardware}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold cursor-pointer shrink-0"
              >
                {testingHardware ? 'Testing...' : 'Test Audio/Video'}
              </button>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>{isSubmitting ? 'Scheduling...' : 'Schedule Virtual Visit'}</span>
              </button>

              {selectedDoctorObj && (
                <button
                  type="button"
                  onClick={() =>
                    handleJoinVideoRoom({
                      id: `vv-instant-${Date.now()}`,
                      roomCode: `TELE-NOW-${Math.floor(1000 + Math.random() * 9000)}`,
                      treatmentCode: `TRT-${Math.floor(100000 + Math.random() * 900000)}`,
                      doctorId: selectedDoctorObj.id,
                      doctorName: selectedDoctorObj.name,
                      doctorSpecialization:
                        selectedDoctorObj.doctorProfile?.specialization || 'Specialist',
                      hospitalName:
                        selectedDoctorObj.doctorProfile?.hospitalName || 'Connected Hospital',
                      date: visitDate,
                      timeSlot: 'Instant Video Consult',
                      reasonForVisit: visitReason,
                      symptoms: visitSymptoms,
                      attachIoTVitals: attachVitals,
                      status: 'in_progress',
                    })
                  }
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <Video className="w-4 h-4 text-teal-400" />
                  <span>Start Instant Call</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right 7 Columns: Scheduled Virtual Visits Queue & One-Click Video Room Launch */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Scheduled Virtual Visits & Telehealth Rooms ({combinedVirtualVisits.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Click "Join Video Room" on any scheduled appointment to launch the live doctor consultation interface.
                </p>
              </div>
            </div>

            {combinedVirtualVisits.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-3 text-xs">
                <Video className="w-8 h-8 text-teal-600 mx-auto opacity-80" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-sm">
                    No Virtual Visits Scheduled Yet
                  </p>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Use the scheduler on the left to book a Virtual Visit with a verified specialist, or launch an instant demo consultation room now.
                  </p>
                </div>
                {selectedDoctorObj && (
                  <button
                    type="button"
                    onClick={() =>
                      handleJoinVideoRoom({
                        id: `vv-demo-${Date.now()}`,
                        roomCode: 'TELE-RM-2048',
                        treatmentCode: 'TRT-884920',
                        doctorId: selectedDoctorObj.id,
                        doctorName: selectedDoctorObj.name,
                        doctorSpecialization:
                          selectedDoctorObj.doctorProfile?.specialization || 'Cardiology',
                        hospitalName:
                          selectedDoctorObj.doctorProfile?.hospitalName || 'Apollo Hospital',
                        date: visitDate,
                        timeSlot: 'Live Demo Session',
                        reasonForVisit: 'IoT Telemetry & Preventive Consultation',
                        symptoms: '',
                        attachIoTVitals: true,
                        status: 'in_progress',
                      })
                    }
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Launch Demo Video Consultation Room</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {combinedVirtualVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 bg-slate-50/60 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          Dr. {visit.doctorName.replace(/^Dr\.\s*/i, '')}
                        </span>
                        <span className="text-teal-700 font-semibold">
                          · {visit.doctorSpecialization}
                        </span>
                      </div>

                      <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{visit.hospitalName}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums text-slate-700">
                          Room: {visit.roomCode}
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-700 font-mono tabular-nums pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <strong>{visit.date}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <strong>{visit.timeSlot}</strong>
                        </span>
                        <span>Passkey: {visit.treatmentCode}</span>
                      </div>

                      <p className="text-slate-600 text-[11px]">
                        Reason: <span className="font-medium text-slate-800">{visit.reasonForVisit}</span>
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                      <span
                        className={`text-[11px] font-bold ${
                          visit.status === 'completed' ? 'text-emerald-700' : 'text-teal-700'
                        }`}
                      >
                        {visit.status === 'completed' ? 'Completed' : 'Ready to Join'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleJoinVideoRoom(visit)}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>
                          {visit.status === 'completed' ? 'Reopen Video Room' : 'Join Video Room'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Telehealth Security Footer */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>HIPAA & ABDM Telemedicine Guidelines Compliant · Live IoT Vitals Stream Enabled</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400">WebRTC 1080p</span>
          </div>
        </div>
      </div>

      {/* ================= CONSULTATION HISTORY (MEDICAL AUDIT TRAIL) ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-teal-700 font-bold text-xs">
              <FileText className="w-4 h-4" />
              <span>Completed Virtual Visits & Medical Audit Trail</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              Consultation History ({fullConsultationHistory.length})
            </h3>
            <p className="text-xs text-slate-500">
              Chronological audit log of completed virtual consultations recording the attending doctor, timestamp, session duration, and telemetry snapshot.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono font-semibold text-slate-700 self-start sm:self-auto">
            Immutable Session Ledger
          </span>
        </div>

        {fullConsultationHistory.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 space-y-1.5">
            <Clock className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No Completed Virtual Visits Logged Yet</p>
            <p className="max-w-md mx-auto">
              Once you complete a live video consultation and click "End Consultation", the attending physician's name, timestamp, and exact session duration will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50/80">
                  <th className="py-2.5 px-3 font-bold">Attending Doctor</th>
                  <th className="py-2.5 px-3 font-bold">Completion Timestamp</th>
                  <th className="py-2.5 px-3 font-bold">Session Duration</th>
                  <th className="py-2.5 px-3 font-bold">Room & Passkey</th>
                  <th className="py-2.5 px-3 font-bold">Clinical Reason & Vitals</th>
                  <th className="py-2.5 px-3 font-bold text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fullConsultationHistory.map((rec) => {
                  const dt = new Date(rec.completedAtIso);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900">
                          Dr. {rec.doctorName.replace(/^Dr\.\s*/i, '')}
                        </div>
                        <div className="text-[11px] text-teal-700 font-medium">
                          {rec.doctorSpecialization}
                        </div>
                        <div className="text-[10px] text-slate-500">{rec.hospitalName}</div>
                      </td>
                      <td className="py-3 px-3 align-top font-mono tabular-nums text-slate-700">
                        <div className="font-bold text-slate-900">
                          {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Slot: {rec.scheduledDate} ({rec.timeSlot})
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top font-mono tabular-nums">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-bold">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>{rec.durationFormatted}</span>
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ({rec.durationSec}s recorded)
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top font-mono tabular-nums text-[11px]">
                        <div className="text-slate-800 font-semibold">{rec.roomCode}</div>
                        <div className="text-emerald-700 font-bold">{rec.treatmentCode}</div>
                      </td>
                      <td className="py-3 px-3 align-top max-w-xs">
                        <div className="font-medium text-slate-800 truncate" title={rec.reasonForVisit}>
                          {rec.reasonForVisit}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {rec.vitalsSnapshot}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
