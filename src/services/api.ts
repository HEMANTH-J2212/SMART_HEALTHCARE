import {
  User,
  IoTReading,
  HealthcareItem,
  Appointment,
  Prescription,
  EmergencyAlert,
  DriverSafetyReading,
  DoctorTransferRequest,
  DoctorLeaveRequest,
  KitPaymentOrder,
  PatientDoctorRequest,
  LabTestOrder
} from '../types';

export const api = {
  // Auth
  async sendOtp(email: string): Promise<{ success: boolean; message: string; previewOtp?: string; emailDetails?: any }> {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send OTP');
    }
    return res.json();
  },

  async verifyOtp(email: string, otp: string): Promise<{ verified: boolean; message?: string }> {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Invalid OTP code');
    }
    return res.json();
  },

  async sendPassword(email: string): Promise<{ success: boolean; message: string; password?: string }> {
    const res = await fetch('/api/auth/send-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to dispatch password');
    }
    return res.json();
  },

  async googleLogin(payload: { email: string; name: string; avatarUrl?: string; autoCreateIfNotFound?: boolean }): Promise<{ success: boolean; user: User }> {
    const res = await fetch('/api/auth/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Google login failed');
    }
    return res.json();
  },

  async register(payload: any): Promise<{ success: boolean; user: User }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async login(email: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async getAllUsers(role?: string): Promise<User[]> {
    const url = role ? `/api/users?role=${role}` : '/api/users';
    const res = await fetch(url);
    return res.json();
  },

  async getUserById(id: string): Promise<User> {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'User not found');
    }
    return res.json();
  },

  async updateUser(id: string, payload: any): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update profile');
    }
    return res.json();
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete account');
    }
  },

  async getAdminDatabase(): Promise<any> {
    const res = await fetch('/api/admin/database');
    return res.json();
  },

  async deleteDatabaseRecord(collection: string, id: string): Promise<void> {
    const res = await fetch('/api/admin/database/delete-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, id }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete record');
    }
  },

  async checkEmail(email: string): Promise<{ exists: boolean; user?: User | null }> {
    const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
    return res.json();
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/database/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
    return res.json();
  },

  async seedDemoDatabase(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/database/seed-demo', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed demo database');
    return res.json();
  },

  async getAdminHospitals(): Promise<User[]> {
    const res = await fetch('/api/admin/hospitals');
    return res.json();
  },

  async getHospitalDirectory(): Promise<any[]> {
    try {
      const res = await fetch('/api/hospitals/directory');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch hospital directory, falling back:', e);
    }
    return this.getAdminHospitals();
  },

  async lookupPincode(pincode: string): Promise<any> {
    const res = await fetch(`/api/lookup/pincode/${pincode}`);
    if (!res.ok) throw new Error('Pincode not found');
    return res.json();
  },

  async reverseGeocode(lat: number, lon: number): Promise<any> {
    const res = await fetch(`/api/lookup/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error('Geocoding failed');
    return res.json();
  },

  async registerHospital(payload: any): Promise<{ success: boolean; hospital: User }> {
    const res = await fetch('/api/admin/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register hospital');
    }
    return res.json();
  },

  async verifyHospital(id: string, action: 'approve' | 'reject' | 'hold', notes?: string): Promise<{ success: boolean; hospital: User; emailSent?: any }> {
    const res = await fetch(`/api/admin/hospitals/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) throw new Error('Failed to update hospital verification');
    return res.json();
  },

  async adminVerifyDoctor(id: string, action: 'approve' | 'reject' | 'hold', notes?: string): Promise<{ success: boolean; doctor: User; emailSent?: any }> {
    const res = await fetch(`/api/admin/doctors/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) throw new Error('Failed to update doctor verification');
    return res.json();
  },

  async updateUserStatus(id: string, status: 'active' | 'suspended'): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`/api/admin/users/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update user status');
    return res.json();
  },

  async getHealthcareItems(): Promise<HealthcareItem[]> {
    const res = await fetch('/api/admin/items');
    return res.json();
  },

  async addHealthcareItem(item: Partial<HealthcareItem>): Promise<{ success: boolean; item: HealthcareItem }> {
    const res = await fetch('/api/admin/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to add healthcare item');
    return res.json();
  },

  async deleteHealthcareItem(id: string): Promise<void> {
    await fetch(`/api/admin/items/${id}`, { method: 'DELETE' });
  },

  // Hospital
  async getHospitalDoctors(hospitalId: string): Promise<User[]> {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctors`);
    return res.json();
  },

  async approveDoctor(
    hospitalId: string,
    doctorId: string,
    action: 'approve' | 'reject' | 'hold' | 'unhold',
    reason?: string
  ): Promise<{ success: boolean; doctor: User }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctors/${doctorId}/approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) throw new Error('Failed to update doctor approval');
    return res.json();
  },

  // Doctor Hospital Transfers
  async getHospitalTransferRequests(hospitalId: string): Promise<DoctorTransferRequest[]> {
    const res = await fetch(`/api/hospitals/${hospitalId}/transfer-requests`);
    return res.json();
  },

  async respondDoctorTransfer(
    hospitalId: string,
    requestId: string,
    action: 'accept' | 'reject',
    notes?: string
  ): Promise<{ success: boolean; transfer: DoctorTransferRequest; doctor?: User }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/transfer-requests/${requestId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to respond to transfer request');
    }
    return res.json();
  },

  async requestDoctorTransfer(
    doctorId: string,
    targetHospitalId: string,
    reason: string
  ): Promise<{ success: boolean; transferRequest: DoctorTransferRequest }> {
    const res = await fetch(`/api/doctors/${doctorId}/request-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetHospitalId, reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to request hospital transfer');
    }
    return res.json();
  },

  async getDoctorTransferStatus(doctorId: string): Promise<DoctorTransferRequest[]> {
    const res = await fetch(`/api/doctors/${doctorId}/transfer-status`);
    return res.json();
  },

  async requestDoctorEmailChange(
    doctorId: string,
    newEmail: string,
    reason: string
  ): Promise<{ success: boolean; message: string; pendingEmailChange: any }> {
    const res = await fetch(`/api/doctors/${doctorId}/request-email-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail, reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit medical email change request');
    }
    return res.json();
  },

  async approveDoctorEmailChange(
    hospitalId: string,
    doctorId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<{ success: boolean; message: string; doctor?: User }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctors/${doctorId}/email-change-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to process email change');
    }
    return res.json();
  },

  // Doctors
  async getApprovedDoctors(specialization?: string, hospitalId?: string): Promise<User[]> {
    let url = '/api/doctors';
    const params = new URLSearchParams();
    if (specialization) params.append('specialization', specialization);
    if (hospitalId) params.append('hospitalId', hospitalId);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url);
    return res.json();
  },

  async getDoctorAppointments(doctorId: string): Promise<Appointment[]> {
    const res = await fetch(`/api/doctors/${doctorId}/appointments`);
    return res.json();
  },

  async updateAppointmentStatus(
    doctorId: string,
    appointmentId: string,
    status: 'approved' | 'rejected' | 'completed',
    rejectionReason?: string,
    treatmentCode?: string
  ): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch(`/api/doctors/${doctorId}/appointments/${appointmentId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason, treatmentCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update appointment');
    }
    return res.json();
  },

  async getSentEmails(to?: string): Promise<any[]> {
    const url = to ? `/api/notifications/emails?to=${encodeURIComponent(to)}` : '/api/notifications/emails';
    const res = await fetch(url);
    return res.json();
  },

  async updateDoctorLeave(doctorId: string, date: string, action: 'add' | 'remove'): Promise<{ success: boolean; leaveDates: string[] }> {
    const res = await fetch(`/api/doctors/${doctorId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, action }),
    });
    if (!res.ok) throw new Error('Failed to update leave dates');
    return res.json();
  },

  async requestDoctorLeave(
    doctorId: string,
    leave: { startDate: string; endDate: string; daysCount: number; reason: string }
  ): Promise<{ success: boolean; message: string; leaveRequest: any }> {
    const res = await fetch(`/api/doctors/${doctorId}/leaves/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leave),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit leave request');
    }
    return res.json();
  },

  async getHospitalLeaveRequests(hospitalId: string): Promise<any[]> {
    const res = await fetch(`/api/hospitals/${hospitalId}/leaves`);
    return res.json();
  },

  async respondDoctorLeaveRequest(
    hospitalId: string,
    leaveId: string,
    action: 'approve' | 'reject',
    responseNotes?: string
  ): Promise<{ success: boolean; leave: any; leaveDates: string[] }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/leaves/${leaveId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, responseNotes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to respond to leave request');
    }
    return res.json();
  },

  async updateDoctorSurgeryStatus(
    doctorId: string,
    inSurgery: boolean,
    surgeryNotes?: string
  ): Promise<{ success: boolean; inSurgery: boolean; surgeryNotes?: string; message: string }> {
    const res = await fetch(`/api/doctors/${doctorId}/surgery-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inSurgery, surgeryNotes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update surgery status');
    }
    return res.json();
  },

  async updateDoctorSlots(
    doctorId: string,
    customSlotTimings: string[]
  ): Promise<{ success: boolean; customSlotTimings: string[]; message: string }> {
    const res = await fetch(`/api/doctors/${doctorId}/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customSlotTimings }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update slot timings');
    }
    return res.json();
  },

  async doctorRegisterPatient(doctorId: string, payload: any): Promise<{ success: boolean; patient: User; password?: string; emailSent?: any; message: string }> {
    const res = await fetch(`/api/doctors/${doctorId}/register-patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register patient');
    }
    return res.json();
  },

  // Patient Appointments & Prescriptions
  async bookAppointment(payload: Partial<Appointment>): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to book appointment');
    }
    return res.json();
  },

  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    const res = await fetch(`/api/appointments/patient/${patientId}`);
    return res.json();
  },

  async getDoctorBookedSlots(doctorId: string, date?: string): Promise<{ doctorId: string; date: string | null; bookedSlots: { date: string; timeSlot: string; status: string; appointmentId: string }[] }> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`/api/doctors/${doctorId}/booked-slots${query}`);
    if (!res.ok) return { doctorId, date: date || null, bookedSlots: [] };
    return res.json();
  },

  async cancelAppointmentWithCode(
    appointmentId: string,
    verificationCode: string,
    reason?: string,
    doctorId?: string
  ): Promise<{ success: boolean; message: string; appointment: Appointment }> {
    const res = await fetch(`/api/appointments/${appointmentId}/cancel-with-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationCode, reason, doctorId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel appointment with verification code');
    }
    return res.json();
  },

  async createPrescription(payload: Partial<Prescription>): Promise<{ success: boolean; prescription: Prescription; followUpAppointment?: Appointment }> {
    const res = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create prescription');
    return res.json();
  },

  async getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
    const res = await fetch(`/api/prescriptions/patient/${patientId}`);
    return res.json();
  },

  async getDoctorPrescriptions(doctorId: string): Promise<Prescription[]> {
    const res = await fetch(`/api/prescriptions/doctor/${doctorId}`);
    if (!res.ok) return [];
    return res.json();
  },

  // IoT Readings
  async submitIoTReading(reading: Partial<IoTReading>): Promise<{ success: boolean; reading: IoTReading }> {
    const res = await fetch('/api/iot/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reading),
    });
    if (!res.ok) throw new Error('Failed to submit reading');
    return res.json();
  },

  async getPatientIoTReadings(patientId: string): Promise<IoTReading[]> {
    const res = await fetch(`/api/iot/readings/patient/${patientId}`);
    return res.json();
  },

  // Driver Safety
  async submitDriverSafetyReading(reading: Partial<DriverSafetyReading>): Promise<{ success: boolean; reading: DriverSafetyReading }> {
    const res = await fetch('/api/iot/driver-safety', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reading),
    });
    if (!res.ok) throw new Error('Failed to record driver telemetry');
    return res.json();
  },

  async getDriverReadings(driverId: string): Promise<DriverSafetyReading[]> {
    const res = await fetch(`/api/iot/driver-safety/${driverId}`);
    return res.json();
  },

  // Emergency SOS
  async triggerEmergency(payload: Partial<EmergencyAlert>): Promise<{ success: boolean; alert: EmergencyAlert }> {
    const res = await fetch('/api/emergency/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to trigger emergency alert');
    return res.json();
  },

  async getEmergencyAlerts(params?: { hospitalId?: string; doctorId?: string; patientId?: string }): Promise<EmergencyAlert[]> {
    let url = '/api/emergency/alerts';
    if (params) {
      const q = new URLSearchParams();
      if (params.hospitalId) q.append('hospitalId', params.hospitalId);
      if (params.doctorId) q.append('doctorId', params.doctorId);
      if (params.patientId) q.append('patientId', params.patientId);
      if (q.toString()) url += `?${q.toString()}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  async updateEmergencyAlertStatus(id: string, status: 'acknowledged' | 'resolved'): Promise<{ success: boolean; alert: EmergencyAlert }> {
    const res = await fetch(`/api/emergency/alerts/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return res.json();
  },

  // Patient Clinical Pathways & Management
  async updateCarePathway(patientId: string, pathway: string): Promise<{ success: boolean; carePathway: string }> {
    const res = await fetch(`/api/patients/${patientId}/care-pathway`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathway }),
    });
    if (!res.ok) throw new Error('Failed to update care pathway');
    return res.json();
  },

  async updateEmergencyContacts(patientId: string, contacts: any[]): Promise<{ success: boolean; contacts: any[] }> {
    const res = await fetch(`/api/patients/${patientId}/emergency-contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    });
    if (!res.ok) throw new Error('Failed to update emergency contacts');
    return res.json();
  },

  async updateDailyMedications(patientId: string, medications: any[]): Promise<{ success: boolean; dailyMedications: any[] }> {
    const res = await fetch(`/api/patients/${patientId}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medications }),
    });
    if (!res.ok) throw new Error('Failed to update medications');
    return res.json();
  },

  async toggleDailyMedication(patientId: string, medId: string): Promise<{ success: boolean; medication: any }> {
    const res = await fetch(`/api/patients/${patientId}/medications/${medId}/toggle`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle medication');
    return res.json();
  },

  // Gemini Smart Appointment Assistant
  async askAppointmentAssistant(requirement: string, patientId?: string, audioBase64?: string, mimeType?: string): Promise<any> {
    const res = await fetch('/api/gemini/appointment-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement, patientId, audioBase64, mimeType }),
    });
    if (!res.ok) throw new Error('Failed to get Gemini recommendation');
    return res.json();
  },

  // Doctor Leave Requests
  async getDoctorLeaves(doctorId: string): Promise<DoctorLeaveRequest[]> {
    const res = await fetch(`/api/doctors/${doctorId}/leaves`);
    if (!res.ok) return [];
    return res.json();
  },

  async submitDoctorLeave(
    doctorId: string,
    leaveData: { startDate: string; endDate: string; daysCount: number; reason: string }
  ): Promise<{ success: boolean; leave: DoctorLeaveRequest; message: string }> {
    const res = await fetch(`/api/doctors/${doctorId}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leaveData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit leave request');
    }
    return res.json();
  },

  async getHospitalDoctorLeaves(hospitalId: string): Promise<DoctorLeaveRequest[]> {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctor-leaves`);
    if (!res.ok) return [];
    return res.json();
  },

  async respondDoctorLeave(
    hospitalId: string,
    leaveId: string,
    status: 'approved' | 'rejected',
    responseNotes?: string
  ): Promise<{ success: boolean; leave: DoctorLeaveRequest; message: string }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctor-leaves/${leaveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, responseNotes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to respond to leave request');
    }
    return res.json();
  },

  async updateDoctorLeaveQuota(
    hospitalId: string,
    doctorId: string,
    maxLeaveAllowance: number
  ): Promise<{ success: boolean; maxLeaveAllowance: number; message: string }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctors/${doctorId}/leave-quota`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxLeaveAllowance }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update leave allowance');
    }
    return res.json();
  },

  // Doctor Surgery Mode & Slot Timings
  async updateDoctorSurgerySlots(
    doctorId: string,
    data: { inSurgery?: boolean; surgeryNotes?: string; customSlotTimings?: string[] }
  ): Promise<{ success: boolean; doctor: User; message: string }> {
    const res = await fetch(`/api/doctors/${doctorId}/surgery-slots`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update surgery / slot timings');
    }
    return res.json();
  },

  // Automated Urgent Surgery Mode Toggle & Conflicting Appointment Reassignment Workflow
  async toggleDoctorSurgeryMode(
    doctorId: string,
    params: { active: boolean; surgeryDate?: string; notes?: string }
  ): Promise<{
    success: boolean;
    inSurgery: boolean;
    targetDate?: string;
    nextAvailableDate?: string;
    conflictingCount?: number;
    reassignedAppointments?: any[];
    doctor?: User;
    message: string;
  }> {
    const res = await fetch(`/api/doctors/${doctorId}/surgery-mode/auto-reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to toggle surgery mode');
    }
    return res.json();
  },

  // Hospital: Set Doctor Consultation Fee
  async updateDoctorConsultationFee(
    hospitalId: string,
    doctorId: string,
    consultationFee: number
  ): Promise<{ success: boolean; doctor: User; consultationFee: number; message: string }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctors/${doctorId}/consultation-fee`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultationFee }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update consultation fee');
    }
    return res.json();
  },

  // Hospital: Update Hospital Logo
  async updateHospitalLogo(
    hospitalId: string,
    logoUrl: string
  ): Promise<{ success: boolean; hospital: User; logoUrl: string; message: string }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/logo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoUrl }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update hospital logo');
    }
    return res.json();
  },

  // Hospital: Onboard a New Doctor directly
  async hospitalOnboardDoctor(
    hospitalId: string,
    doctorData: any
  ): Promise<{ success: boolean; doctor: User; password?: string; emailSent?: any; message: string }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/onboard-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctorData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to onboard doctor');
    }
    return res.json();
  },

  // Hospital: Update Hospital Settings
  async updateHospitalSettings(
    hospitalId: string,
    settings: any
  ): Promise<{ success: boolean; hospital: User; message: string }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update hospital settings');
    }
    return res.json();
  },

  // Auth: Change Password via Old Password or OTP
  async changePassword(
    payload: {
      userId?: string;
      email?: string;
      method: 'password' | 'otp';
      oldPassword?: string;
      newPassword: string;
      otp?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to change password');
    }
    return res.json();
  },

  // Hospital or Admin: Full Doctor Details & Visited Patients
  async getDoctorFullDetails(
    hospitalIdOrDoctorId: string,
    doctorId?: string
  ): Promise<{ doctor: User; appointments: Appointment[]; prescriptions: Prescription[]; leaves: DoctorLeaveRequest[]; patientsCount: number }> {
    const url = doctorId
      ? `/api/hospitals/${hospitalIdOrDoctorId}/doctors/${doctorId}/full-details`
      : `/api/admin/doctors/${hospitalIdOrDoctorId}/full-details`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch doctor full details');
    }
    return res.json();
  },

  // Doctor: Mark Appointment as Missed (No-Show)
  async markAppointmentMissed(
    doctorId: string,
    appointmentId: string
  ): Promise<{ success: boolean; appointment: Appointment; patientScore: number; message: string }> {
    const res = await fetch(`/api/doctors/${doctorId}/appointments/${appointmentId}/mark-missed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to mark appointment as missed');
    }
    return res.json();
  },

  // Patient selects doctor & sends patient request
  async requestDoctorAssignment(
    patientId: string,
    doctorId: string,
    message?: string
  ): Promise<{ success: boolean; request: any; message: string }> {
    const res = await fetch(`/api/patients/${patientId}/choose-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId, message }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit doctor request');
    }
    return res.json();
  },

  // Doctor gets incoming patient requests
  async getDoctorPatientRequests(doctorId: string): Promise<any[]> {
    const res = await fetch(`/api/doctors/${doctorId}/patient-requests`);
    if (!res.ok) return [];
    return res.json();
  },

  // Patient gets their own doctor requests
  async getPatientDoctorRequests(patientId: string): Promise<PatientDoctorRequest[]> {
    const res = await fetch(`/api/patients/${patientId}/doctor-requests`);
    if (!res.ok) return [];
    return res.json();
  },

  // Doctor accepts or declines patient request (with capacity of 10-15 patients)
  async respondDoctorPatientRequest(
    doctorId: string,
    requestId: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; message: string; request: any; doctorQuota?: any }> {
    const res = await fetch(`/api/doctors/${doctorId}/patient-requests/${requestId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to respond to patient request');
    }
    return res.json();
  },

  // Patient purchases IoT Kit from app store with payment checkout
  async purchaseIoTKit(
    patientId: string,
    itemId: string,
    paymentData?: {
      paymentMethod?: string;
      shippingAddress?: string;
      patientPhone?: string;
      amount?: number;
    }
  ): Promise<{ success: boolean; message: string; connectedDevices: string[]; user: User; paymentOrder?: KitPaymentOrder }> {
    const res = await fetch(`/api/patients/${patientId}/purchase-iot-kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, ...paymentData }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to purchase IoT kit');
    }
    return res.json();
  },

  // Admin gets all received payments for healthcare kit orders
  async getAdminKitPayments(): Promise<KitPaymentOrder[]> {
    const res = await fetch('/api/admin/payments');
    if (!res.ok) return [];
    return res.json();
  },

  // Admin updates payment / order fulfillment status
  async updateKitPaymentStatus(
    paymentId: string,
    updates: { paymentStatus?: string; fulfillmentStatus?: string; trackingNumber?: string; adminNotes?: string }
  ): Promise<{ success: boolean; message: string; order: KitPaymentOrder }> {
    const res = await fetch(`/api/admin/payments/${paymentId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update payment status');
    }
    return res.json();
  },

  // Patient permanent lock for emergency hospital & doctor routing
  async setEmergencyRouting(
    patientId: string,
    hospitalId: string,
    doctorId?: string
  ): Promise<{ success: boolean; message: string; user: User }> {
    const res = await fetch(`/api/patients/${patientId}/emergency-routing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId, doctorId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to set emergency routing');
    }
    return res.json();
  },

  // Doctor: Schedule planned surgery (at least 7 days ahead)
  async schedulePlannedSurgery(
    doctorId: string,
    surgery: { date: string; timeSlot: string; procedureName: string; operatingTheater?: string; notes?: string }
  ): Promise<{ success: boolean; message: string; surgery: any }> {
    const res = await fetch(`/api/doctors/${doctorId}/surgeries/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(surgery),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to schedule surgery');
    }
    return res.json();
  },

  // Doctor: Urgent Surgery Mode - Reschedule tomorrow's or urgent day's appointments
  async rescheduleUrgentSurgeryAppointments(
    doctorId: string,
    payload: { surgeryDate: string; newDate: string; newTimeSlot?: string; notes?: string }
  ): Promise<{ success: boolean; message: string; rescheduledCount: number; appointments: Appointment[] }> {
    const res = await fetch(`/api/doctors/${doctorId}/surgery-mode/reschedule-appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reschedule appointments');
    }
    return res.json();
  },

  // Doctor: Get treated / completed patients list
  async getDoctorTreatedPatients(doctorId: string): Promise<any[]> {
    const res = await fetch(`/api/doctors/${doctorId}/treated-patients`);
    if (!res.ok) return [];
    return res.json();
  },

  // Doctor: Verify patient health condition
  async verifyPatientHealth(
    doctorId: string,
    patientId: string,
    verification: { status: 'clear' | 'observation' | 'critical'; notes: string }
  ): Promise<{ success: boolean; message: string; verification: any }> {
    const res = await fetch(`/api/doctors/${doctorId}/verify-patient-health/${patientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verification),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to verify patient health');
    }
    return res.json();
  },

  // ==========================================
  // Hospital Lab Tests & Doctor Diagnostic Orders
  // ==========================================

  // Hospital: Get available lab tests
  async getHospitalLabTests(hospitalId: string): Promise<{ success: boolean; availableLabTests: string[] }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/lab-tests`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch hospital lab tests');
    }
    return res.json();
  },

  // Hospital: Update available lab tests
  async updateHospitalLabTests(hospitalId: string, availableLabTests: string[]): Promise<{ success: boolean; message: string; availableLabTests: string[] }> {
    const res = await fetch(`/api/hospitals/${hospitalId}/lab-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableLabTests }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update hospital lab tests');
    }
    return res.json();
  },

  // Lab Test Orders: Query by hospital, doctor, or patient
  async getLabTestOrders(params?: { hospitalId?: string; doctorId?: string; patientId?: string }): Promise<LabTestOrder[]> {
    const query = new URLSearchParams();
    if (params?.hospitalId) query.set('hospitalId', params.hospitalId);
    if (params?.doctorId) query.set('doctorId', params.doctorId);
    if (params?.patientId) query.set('patientId', params.patientId);
    const res = await fetch(`/api/lab-tests?${query.toString()}`);
    if (!res.ok) return [];
    return res.json();
  },

  // Doctor: Order lab tests for a patient
  async orderLabTests(payload: {
    patientId: string;
    doctorId: string;
    testNames: string[];
    clinicalIndication?: string;
  }): Promise<{ success: boolean; message: string; order: LabTestOrder }> {
    const res = await fetch('/api/lab-tests/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to order lab tests');
    }
    return res.json();
  },

  async orderLabTest(payload: {
    patientId: string;
    doctorId: string;
    testNames: string[];
    clinicalIndication?: string;
  }): Promise<{ success: boolean; message: string; order: LabTestOrder }> {
    return this.orderLabTests(payload);
  },

  // Hospital or Doctor: Mark lab test complete
  async completeLabTest(orderId: string, reportNotes?: string): Promise<{ success: boolean; message: string; order: LabTestOrder }> {
    const res = await fetch(`/api/lab-tests/${orderId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportNotes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to mark lab test complete');
    }
    return res.json();
  },

  // Doctor: Book 100% Free Follow-Up Appointment after Lab Test
  async bookFreeFollowUp(orderId: string, payload: {
    date: string;
    timeSlot: string;
    followUpNotes?: string;
  }): Promise<{ success: boolean; message: string; appointment: Appointment; order: LabTestOrder }> {
    const res = await fetch(`/api/lab-tests/${orderId}/free-followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to book free follow-up appointment');
    }
    return res.json();
  },

  // Doctor: Refer Patient to another Specialist & Book Appointment
  async referPatientToDoctor(payload: {
    patientId: string;
    referringDoctorId: string;
    targetDoctorId: string;
    date: string;
    timeSlot: string;
    referralReason: string;
  }): Promise<{ success: boolean; message: string; appointment: Appointment }> {
    const res = await fetch('/api/doctors/refer-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to refer patient');
    }
    return res.json();
  },
};

