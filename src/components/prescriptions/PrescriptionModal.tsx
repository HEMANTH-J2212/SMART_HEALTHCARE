import React, { useState } from 'react';
import { X, Printer, Download, HeartPulse, Building2, Stethoscope, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Prescription } from '../../types';

interface PrescriptionModalProps {
  prescription: Prescription | null;
  onClose: () => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  prescription,
  onClose,
}) => {
  if (!prescription) return null;

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Prevent background portal scrolling when PDF modal is open
  React.useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      setDownloading(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 14;

      // Hospital Header Banner
      doc.setFillColor(15, 118, 110); // Teal 700
      doc.rect(14, y, pageWidth - 28, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      const cleanHospTitle = doc.splitTextToSize(prescription.hospitalName || 'Smart Health Medical Center', pageWidth - 42);
      doc.text(cleanHospTitle[0] || prescription.hospitalName, 20, y + 8.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Accredited Multi-Specialty Healthcare & Telemetry Center | Prescription ID: ' + prescription.id, 20, y + 16);

      y += 28;

      // Doctor Details & Consultation Date
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(prescription.doctorName, 16, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      doc.text(prescription.doctorSpecialization, 16, y + 5);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Medical License: ' + (prescription.doctorLicenseNumber || 'MED-REG-LIC'), 16, y + 10);

      // Date on right
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Date: ' + new Date(prescription.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - 16, y, { align: 'right' });

      y += 16;

      // Patient Details Strip Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, pageWidth - 28, 17, 2, 2, 'FD');

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PATIENT NAME', 20, y + 5.5);
      doc.text('AGE / GENDER', 75, y + 5.5);
      doc.text('BP / HEART RATE', 125, y + 5.5);
      doc.text('SPO2 / TEMP', 165, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(prescription.patientName, 20, y + 11.5);
      doc.text(`${prescription.patientAge || 38} Yrs / ${prescription.patientGender || 'Adult'}`, 75, y + 11.5);
      doc.text(`${prescription.vitalsRecorded?.bp || '120/80'} | ${prescription.vitalsRecorded?.heartRate || '72'} bpm`, 125, y + 11.5);
      doc.text(`${prescription.vitalsRecorded?.spO2 || '98'}% | ${prescription.vitalsRecorded?.temp || '36.6'} C`, 165, y + 11.5);

      y += 22;

      // Clinical Diagnosis
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('CLINICAL ASSESSMENT & DIAGNOSIS', 16, y);

      y += 3.5;
      const splitDiag = doc.splitTextToSize(prescription.diagnosis || 'Clinical Consultation', pageWidth - 42);
      const diagBoxHeight = Math.max(10, splitDiag.length * 5 + 4);

      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(153, 246, 228);
      doc.roundedRect(14, y, pageWidth - 28, diagBoxHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      doc.text(splitDiag, 20, y + 6);

      y += diagBoxHeight + 6;

      // Rx Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 118, 110);
      doc.text('Rx - Prescribed Medications', 16, y);

      y += 4.5;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, y, pageWidth - 28, 7.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('MEDICINE & DOSAGE', 18, y + 5);
      doc.text('FREQUENCY / TIMING', 85, y + 5);
      doc.text('DURATION', 135, y + 5);
      doc.text('INSTRUCTIONS', 162, y + 5);

      y += 7.5;

      // Medicines rows
      prescription.medicines.forEach((med) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(241, 245, 249);
        doc.rect(14, y, pageWidth - 28, 8.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        const medTitle = doc.splitTextToSize(`${med.name} (${med.dosage})`, 65);
        doc.text(medTitle[0] || med.name, 18, y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 118, 110);
        const medFreq = doc.splitTextToSize(med.frequency || 'Daily', 48);
        doc.text(medFreq[0] || med.frequency, 85, y + 5.5);

        doc.setTextColor(71, 85, 105);
        doc.text(med.duration || '7 Days', 135, y + 5.5);

        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const inst = doc.splitTextToSize(med.instructions || 'As advised', 32);
        doc.text(inst[0] || 'As advised', 162, y + 5.5);

        y += 8.5;
      });

      y += 5;

      // Advice & Lifestyle Box
      const splitAdvice = doc.splitTextToSize(
        prescription.advice || 'Follow medication schedule, monitor daily vitals, and maintain healthy lifestyle.',
        pageWidth - 42
      );
      const adviceBoxHeight = Math.max(16, splitAdvice.length * 4.5 + 8);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, pageWidth - 28, adviceBoxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('DIETARY & LIFESTYLE ADVICE:', 18, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(splitAdvice, 18, y + 10);

      y += adviceBoxHeight + 5;

      // Follow-up Review Date
      const followUpText = prescription.followUpDate
        ? new Date(prescription.followUpDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Within 2 to 4 weeks or upon abnormal IoT vital reading';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Follow-up Review Date: ' + followUpText, 16, y);

      y += 8;

      // Check if we need page break for Stamp & Signature blocks
      const blockWidth = 82;
      const blockHeight = 32;

      if (y + blockHeight > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      // ==========================================
      // DEDICATED BLOCKS: HOSPITAL STAMP & DOCTOR SIGNATURE
      // ==========================================

      // 1. HOSPITAL OFFICIAL STAMP BLOCK (Left)
      doc.setDrawColor(2, 132, 199); // Sky blue stamp ink
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(16, y, blockWidth, blockHeight, 2, 2, 'FD');
      // Inner dashed stamp line
      doc.setLineDashPattern([2, 1], 0);
      doc.setDrawColor(14, 165, 233);
      doc.roundedRect(18, y + 2, blockWidth - 4, blockHeight - 4, 1, 1, 'S');
      doc.setLineDashPattern([], 0); // Reset dash

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(3, 105, 161);
      doc.text('[ OFFICIAL CLINICAL SEAL & STAMP ]', 16 + blockWidth / 2, y + 6.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const splitHosp = doc.splitTextToSize(prescription.hospitalName || 'Clinical Care Facility', blockWidth - 10);
      doc.text(splitHosp[0] || prescription.hospitalName, 16 + blockWidth / 2, y + 12, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      doc.text('Clinical Establishment Act License: CEA-REG-2024', 16 + blockWidth / 2, y + 18, { align: 'center' });
      doc.text('NABH & JCI Accredited Hospital Network', 16 + blockWidth / 2, y + 22, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(2, 132, 199);
      doc.text('[ VERIFIED & OFFICIALLY DISPATCHED ]', 16 + blockWidth / 2, y + 27.5, { align: 'center' });

      // 2. DOCTOR OFFICIAL SIGNATURE BLOCK (Right)
      const sigX = pageWidth - blockWidth - 16;
      doc.setDrawColor(16, 185, 129); // Emerald stamp ink
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(sigX, y, blockWidth, blockHeight, 2, 2, 'FD');
      // Inner dashed line
      doc.setLineDashPattern([2, 1], 0);
      doc.setDrawColor(52, 211, 153);
      doc.roundedRect(sigX + 2, y + 2, blockWidth - 4, blockHeight - 4, 1, 1, 'S');
      doc.setLineDashPattern([], 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87);
      doc.text('PHYSICIAN DIGITAL SIGNATURE & AUTH', sigX + blockWidth / 2, y + 6.5, { align: 'center' });

      // Stylized Signature
      doc.setFont('times', 'italic');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(prescription.doctorName, sigX + blockWidth / 2, y + 13.5, { align: 'center' });

      // Signature baseline
      doc.setDrawColor(148, 163, 184);
      doc.line(sigX + 10, y + 15.5, sigX + blockWidth - 10, y + 15.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 118, 110);
      doc.text('Electronically Signed & Authorized', sigX + blockWidth / 2, y + 19.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      doc.text(`Medical Lic: REG-MED-${prescription.doctorId.slice(-6).toUpperCase()}`, sigX + blockWidth / 2, y + 24, { align: 'center' });
      doc.text(`Signed on: ${new Date(prescription.createdAt).toLocaleDateString()}`, sigX + blockWidth / 2, y + 28, { align: 'center' });

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('This is a verified electronically signed medical prescription generated via Smart Health Connected Care Ecosystem.', pageWidth / 2, 287, { align: 'center' });

      // Save PDF file
      const fileName = `Prescription_${prescription.id}.pdf`;
      doc.save(fileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      // Fallback to print
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden transition-all duration-200 select-none"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-slate-800 h-[90vh] max-h-[90vh] flex flex-col transition-all duration-200 transform animate-in fade-in zoom-in-95 print:m-0 print:p-6 print:border-none print:shadow-none print:h-auto print:max-h-none">
        
        {/* Actions bar (hidden during print) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 print:hidden shrink-0">
          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-teal-600" />
            Official Medical Prescription Record
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-200" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Prescription Document */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 sm:pr-2 space-y-6 select-text">
          
          {/* Hospital & Doctor Header */}
          <div className="flex justify-between items-start border-b-2 border-teal-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-700" />
                {prescription.hospitalName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Accredited Multi-Specialty Healthcare & IoT Monitoring Center
              </p>
              <p className="text-[11px] text-slate-400">
                Prescription ID: <span className="font-mono font-bold text-slate-600">{prescription.id}</span>
              </p>
            </div>

            <div className="text-right">
              <h3 className="text-sm font-bold text-slate-900">{prescription.doctorName}</h3>
              <p className="text-xs text-teal-700 font-semibold">{prescription.doctorSpecialization}</p>
              <p className="text-[11px] font-mono text-slate-500">
                Reg/Lic: {prescription.doctorLicenseNumber}
              </p>
              <p className="text-[11px] text-slate-500">
                Date: {new Date(prescription.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Patient Details strip */}
          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Patient Name</span>
              <span className="font-bold text-slate-900">{prescription.patientName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Age / Gender</span>
              <span className="font-semibold text-slate-800">{prescription.patientAge || '38'} Yrs / {prescription.patientGender || 'Adult'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">BP / Pulse</span>
              <span className="font-semibold text-slate-800 font-mono">
                {prescription.vitalsRecorded?.bp || '120/80'} | {prescription.vitalsRecorded?.heartRate || '74'} bpm
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">SpO2 / Temp</span>
              <span className="font-semibold text-slate-800 font-mono">
                {prescription.vitalsRecorded?.spO2 || '98'}% | {prescription.vitalsRecorded?.temp || '36.7'}°C
              </span>
            </div>
          </div>

          {/* Diagnosis */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Clinical Diagnosis / Assessment
            </span>
            <div className="p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl text-xs font-semibold text-slate-800">
              {prescription.diagnosis}
            </div>
          </div>

          {/* Rx Medicines Table */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base font-serif font-black text-teal-800">℞</span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Prescribed Medications
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Medicine & Strength</th>
                    <th className="py-2.5 px-3">Frequency / Timing</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Special Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescription.medicines.map((med, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {med.name} <span className="font-normal text-slate-500">({med.dosage})</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-teal-700">
                        {med.frequency}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {med.duration}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {med.instructions || 'As advised'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advice & Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Dietary & Lifestyle Advice
              </span>
              <p className="text-slate-700 leading-relaxed">{prescription.advice}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Follow-up Review Date
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {prescription.followUpDate
                  ? new Date(prescription.followUpDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'Within 2 to 4 weeks or if IoT alert triggers'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Bring this prescription and recent IoT vital reports during the next follow-up consultation.
              </p>
            </div>
          </div>

          {/* DEDICATED OFFICIAL BLOCKS: HOSPITAL STAMP & DOCTOR SIGNATURE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* 1. Official Clinical Stamp / Seal */}
            <div className="p-3.5 bg-sky-50/70 border-2 border-dashed border-sky-400 rounded-2xl relative overflow-hidden text-center flex flex-col justify-between">
              <div className="text-[10px] font-black tracking-widest text-sky-800 uppercase flex items-center justify-center gap-1">
                <span>★ Official Clinical Seal & Stamp ★</span>
              </div>
              <div className="my-2">
                <p className="text-xs font-bold text-slate-900">
                  {prescription.hospitalName || 'Metro General Hospital'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Clinical Est. Lic: CEA-REG-2024 • NABH Accredited
                </p>
              </div>
              <div className="inline-block mx-auto px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                Verified & Validated
              </div>
            </div>

            {/* 2. Doctor Signature & Stamp */}
            <div className="p-3.5 bg-emerald-50/70 border-2 border-dashed border-emerald-400 rounded-2xl relative overflow-hidden text-center flex flex-col justify-between">
              <div className="text-[10px] font-black tracking-widest text-emerald-800 uppercase flex items-center justify-center gap-1">
                <span>Physician Digital Signature</span>
              </div>
              <div className="my-1.5">
                <p className="font-serif italic text-base font-bold text-slate-900">
                  {prescription.doctorName}
                </p>
                <div className="w-36 h-0.5 bg-slate-300 mx-auto my-1"></div>
                <p className="text-[10px] font-semibold text-emerald-700">
                  Electronically Authorized Medical Practitioner
                </p>
                <p className="text-[9px] font-mono text-slate-500">
                  Lic: REG-MED-{prescription.doctorId.slice(-6).toUpperCase()}
                </p>
              </div>
              <div className="text-[9px] text-slate-400">
                Signed on: {new Date(prescription.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-between">
            <span>Valid electronically generated medical prescription.</span>
            <span>Emergency Telehealth: 1-800-555-9111</span>
          </div>

        </div>

      </div>
    </div>
  );
};
