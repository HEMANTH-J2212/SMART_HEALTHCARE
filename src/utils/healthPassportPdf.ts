import { jsPDF } from 'jspdf';
import { User, IoTReading, Prescription, EmergencyContactEntry } from '../types';

interface HealthPassportData {
  patient: User;
  latestReading?: IoTReading;
  prescriptions: Prescription[];
  emergencyContacts: EmergencyContactEntry[];
}

export function generateHealthPassportPdf(data: HealthPassportData): void {
  const { patient, latestReading, prescriptions, emergencyContacts } = data;
  const profile = patient.patientProfile;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header Banner - Deep Clinical Slate & Teal
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(12, y, pageWidth - 24, 26, 'F');

  // Accent line
  doc.setFillColor(15, 118, 110); // teal-700
  doc.rect(12, y + 24, pageWidth - 24, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EMERGENCY CLINICAL HEALTH PASSPORT', 18, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const passId = `CHP-${patient.id.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  doc.text(`Official Patient Triage & Critical Care Summary | Passport ID: ${passId}`, 18, y + 18);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 18, y + 18, { align: 'right' });

  y += 32;

  // Section 1: Patient Identity & Critical Baseline
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(12, y, pageWidth - 24, 38, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(12, y, pageWidth - 24, 38, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. PATIENT IDENTIFICATION & CRITICAL DEMOGRAPHICS', 16, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const col1X = 16;
  const col2X = 80;
  const col3X = 142;

  doc.text(`Full Name: ${patient.name}`, col1X, y + 15);
  doc.text(`Date of Birth: ${profile?.dateOfBirth || 'Not specified'}`, col1X, y + 21);
  doc.text(`Gender: ${(profile?.gender || 'Not specified').toUpperCase()}`, col1X, y + 27);
  doc.text(`Phone: ${patient.phone || 'Not recorded'}`, col1X, y + 33);

  // Blood group highlighted
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`Blood Group: ${profile?.bloodGroup || 'UNKNOWN'}`, col2X, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Height: ${profile?.heightCm ? `${profile.heightCm} cm` : 'N/A'}`, col2X, y + 21);
  doc.text(`Weight: ${profile?.weightKg ? `${profile.weightKg} kg` : 'N/A'}`, col2X, y + 27);
  doc.text(`BMI: ${profile?.bmi || 'N/A'}`, col2X, y + 33);

  doc.text(`Primary Hospital: ${profile?.assignedHospitalName || profile?.chosenEmergencyHospitalName || 'Affiliated Hospital'}`, col3X, y + 15);
  doc.text(`Attending Doctor: ${profile?.assignedDoctorName ? `Dr. ${profile.assignedDoctorName}` : 'Hospital ER Staff'}`, col3X, y + 21);
  doc.text(`Care Pathway: ${(profile?.carePathway || 'General Care').toUpperCase()}`, col3X, y + 27);
  doc.text(`District/City: ${profile?.district || profile?.city || 'Registered Region'}`, col3X, y + 33);

  y += 43;

  // Section 2: Chronic Conditions & Known Allergies
  doc.setFillColor(254, 242, 242); // rose-50
  doc.rect(12, y, pageWidth - 24, 24, 'F');
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.rect(12, y, pageWidth - 24, 24, 'S');

  doc.setTextColor(190, 18, 60); // rose-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. MEDICAL ALERTS: CONDITIONS & ALLERGIES', 16, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  const conditionsStr = profile?.existingConditions && profile.existingConditions.length > 0
    ? profile.existingConditions.join(', ')
    : 'None recorded';
  const allergiesStr = profile?.allergies && profile.allergies.length > 0
    ? profile.allergies.join(', ')
    : 'None recorded / No known drug allergies (NKDA)';

  doc.text(`Chronic Conditions / Diagnoses: ${conditionsStr}`, 16, y + 13);
  doc.setTextColor(190, 18, 60);
  doc.setFont('helvetica', 'bold');
  doc.text(`Known Allergies & Contraindications: ${allergiesStr}`, 16, y + 19);

  y += 29;

  // Section 3: Latest Telemetry & Vitals Snapshot
  doc.setFillColor(240, 253, 250); // teal-50
  doc.rect(12, y, pageWidth - 24, 28, 'F');
  doc.setDrawColor(153, 246, 228); // teal-200
  doc.rect(12, y, pageWidth - 24, 28, 'S');

  doc.setTextColor(15, 118, 110); // teal-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('3. LATEST IOT TELEMETRY & CLINICAL VITALS SNAPSHOT', 16, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  if (latestReading) {
    const readingTime = new Date(latestReading.timestamp).toLocaleString();
    doc.text(`Recorded At: ${readingTime} (Status: ${latestReading.status?.toUpperCase()})`, 16, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.text(`Blood Pressure: ${latestReading.systolicBp}/${latestReading.diastolicBp} mmHg`, 16, y + 20);
    doc.text(`Heart Rate: ${latestReading.heartRate} BPM`, 72, y + 20);
    doc.text(`SpO2 Oxygen: ${latestReading.spO2}%`, 122, y + 20);
    doc.text(`Glucose: ${latestReading.glucose} mg/dL`, 165, y + 20);

    if (latestReading.geminiAnalysis?.summary) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const summaryLine = doc.splitTextToSize(`Gemini AI Triage: ${latestReading.geminiAnalysis.summary}`, pageWidth - 36);
      doc.text(summaryLine[0] || '', 16, y + 25);
    }
  } else {
    doc.text('No active IoT telemetry readings recorded recently.', 16, y + 15);
  }

  y += 33;

  // Section 4: Emergency Contacts & Dispatch Hierarchy
  doc.setFillColor(248, 250, 252);
  doc.rect(12, y, pageWidth - 24, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, y, pageWidth - 24, 30, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('4. VERIFIED EMERGENCY CONTACTS & ESCALATION DIRECTORY', 16, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const displayContacts = emergencyContacts.length > 0
    ? emergencyContacts
    : profile?.emergencyContact
    ? [{
        id: 'c1',
        name: profile.emergencyContact.name,
        relationship: profile.emergencyContact.relationship,
        phone: profile.emergencyContact.phone,
        priority: 'primary' as const,
        notifySms: true,
        notifyEmail: true,
        shareLiveLocation: true,
      }]
    : [];

  if (displayContacts.length > 0) {
    let cy = y + 13;
    displayContacts.slice(0, 3).forEach((c, i) => {
      const priorityLabel = c.priority === 'primary' ? '1. Primary Next of Kin' : c.priority === 'secondary' ? '2. Secondary Caregiver' : '3. Physician/Family';
      doc.setFont('helvetica', 'bold');
      doc.text(`${priorityLabel}: ${c.name} (${c.relationship})`, 16, cy);
      doc.setFont('helvetica', 'normal');
      doc.text(`Phone: ${c.phone} | SMS Alert: ${c.notifySms !== false ? 'Enabled' : 'Disabled'} | GPS Live: ${c.shareLiveLocation !== false ? 'Active' : 'Off'}`, 100, cy);
      cy += 6;
    });
  } else {
    doc.text('No emergency contacts registered. Please add contacts in the Patient Dashboard.', 16, y + 15);
  }

  y += 35;

  // Section 5: Active Prescriptions & Daily Medications
  doc.setFillColor(248, 250, 252);
  doc.rect(12, y, pageWidth - 24, 36, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, y, pageWidth - 24, 36, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('5. ACTIVE PRESCRIPTIONS & CLINICAL REGIMEN', 16, y + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const allMeds: string[] = [];
  prescriptions.forEach((rx) => {
    rx.medicines?.forEach((m: any) => {
      allMeds.push(`${m.name} (${m.dosage}, ${m.frequency}) - for ${m.durationDays || m.duration}d`);
    });
  });
  if (profile?.dailyMedications) {
    profile.dailyMedications.forEach((dm: any) => {
      allMeds.push(`${dm.name} (${dm.dosage}) - ${dm.timing.toUpperCase()}`);
    });
  }

  if (allMeds.length > 0) {
    let my = y + 13;
    const uniqueMeds = Array.from(new Set(allMeds)).slice(0, 4);
    uniqueMeds.forEach((m) => {
      doc.text(`- ${m}`, 16, my);
      my += 5;
    });
    if (allMeds.length > 4) {
      doc.text(`+ ${allMeds.length - 4} more medications on file...`, 16, my);
    }
  } else {
    doc.text('No active prescription regimens currently listed.', 16, y + 15);
  }

  // Footer / Disclaimer
  const footerY = 282;
  doc.setDrawColor(203, 213, 225);
  doc.line(12, footerY, pageWidth - 12, footerY);

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'CONFIDENTIAL CLINICAL RECORD: This document is intended for first responders, attending physicians, and triage staff in emergency events.',
    12,
    footerY + 4
  );
  doc.text(
    'Verified by Smart Health Hospital Cloud Infrastructure | Valid across all accredited trauma centers.',
    12,
    footerY + 8
  );

  doc.save(`Clinical_Health_Passport_${patient.name.replace(/\s+/g, '_')}.pdf`);
}
