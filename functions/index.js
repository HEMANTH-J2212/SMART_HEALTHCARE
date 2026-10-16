/**
 * Firebase Cloud Functions (v2 / v1 Firestore Triggers)
 * Automated Email Notifications Service for Hospital & Doctor Ecosystem
 *
 * Trigger 1: When Admin approves a hospital registration -> email sent from Admin to Hospital.
 * Trigger 2: When Hospital approves a doctor's registration -> email sent to Doctor.
 * Trigger 3: When Hospital puts doctor activities ON HOLD -> email sent to Doctor.
 * Trigger 4: When a Hospital registers -> email sent to Hospital that request is sent to Admin.
 * Trigger 5: When Doctor requests a Hospital transfer -> target hospital receives request.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Admin configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hemanthreddychilla220507@gmail.com';
const ADMIN_NAME = 'HEMANTH (System Administrator)';

// Configure Email Transporter (e.g. Gmail SMTP or SendGrid / Mailgun)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || ADMIN_EMAIL,
    pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Helper to dispatch email and log delivery in Firestore
 */
async function sendNotificationEmail({ to, from = ADMIN_EMAIL, subject, text, html, metadata = {} }) {
  try {
    const info = await transporter.sendMail({
      from: `"${ADMIN_NAME}" <${from}>`,
      to,
      subject,
      text,
      html: html || `<p style="font-family:sans-serif;line-height:1.6;">${text.replace(/\n/g, '<br/>')}</p>`,
    });

    console.log(`[CloudFunction] Email sent successfully to ${to}. MessageId: ${info.messageId}`);

    // Audit log to Firestore
    await db.collection('email_audit_logs').add({
      to,
      from,
      subject,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      messageId: info.messageId,
      metadata,
    });
  } catch (error) {
    console.error(`[CloudFunction] Error sending email to ${to}:`, error);
  }
}

/**
 * 1. TRIGGER: Hospital Registration Initial Submission
 * When a hospital registers, it should NOT get access immediately.
 * A mail is sent that the request is sent to the admin.
 */
exports.onHospitalRegistrationSubmitted = functions.firestore
  .document('hospitals/{hospitalId}')
  .onCreate(async (snap, context) => {
    const hospital = snap.data();
    const hospitalEmail = hospital.email || hospital.contactEmail;
    const hospitalName = hospital.hospitalName || hospital.name;

    if (!hospitalEmail) return null;

    const emailSubject = 'Hospital Registration Request Received - Awaiting Admin Approval';
    const emailBody = `Dear Medical Administration of ${hospitalName},\n\n` +
      `Your request for hospital registration has been sent to the admin (${ADMIN_EMAIL}).\n\n` +
      `He will accept the request after you can enter the sign-in details and log in.\n\n` +
      `Please note that direct sign-in is disabled until your registration credentials are officially reviewed and approved by the admin. Once approved, you will receive another email confirmation from the admin's email allowing you to log in and register your doctors.\n\n` +
      `Warm regards,\n` +
      `Admin Hemanth\n` +
      `${ADMIN_EMAIL}`;

    return sendNotificationEmail({
      to: hospitalEmail,
      from: ADMIN_EMAIL,
      subject: emailSubject,
      text: emailBody,
      metadata: { event: 'hospital_registration_submitted', hospitalId: context.params.hospitalId },
    });
  });

/**
 * 2. TRIGGER: Admin Approves Hospital Registration
 * Whenever the admin accepts the hospital request, the hospital receives a mail
 * from the admin's email stating that the request is accepted: "Please log in and register your doctors."
 */
exports.onAdminApprovesHospital = functions.firestore
  .document('hospitals/{hospitalId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to approved/active or verificationStatus changed to verified
    const isNewlyApproved =
      (before.status !== 'active' && after.status === 'active') ||
      (before.verificationStatus !== 'verified' && after.verificationStatus === 'verified');

    if (!isNewlyApproved) {
      return null;
    }

    const hospitalEmail = after.email || after.contactEmail;
    const hospitalName = after.hospitalName || after.name;

    const emailSubject = 'Your request for the hospital registration is accepted';
    const emailBody = `Dear Medical Administration of ${hospitalName},\n\n` +
      `Your request for the hospital registration is accepted by Admin Hemanth (${ADMIN_EMAIL}).\n\n` +
      `Please log in and register your doctors.\n\n` +
      `You can now enter your sign-in details and log in to your Hospital Management Dashboard at any time to onboard specialist physicians, manage departments, and receive patient appointments.\n\n` +
      `Warm regards,\n` +
      `Admin Hemanth\n` +
      `${ADMIN_EMAIL}`;

    return sendNotificationEmail({
      to: hospitalEmail,
      from: ADMIN_EMAIL,
      subject: emailSubject,
      text: emailBody,
      metadata: { event: 'admin_approved_hospital', hospitalId: context.params.hospitalId },
    });
  });

/**
 * 3. TRIGGER: Doctor Registers & Request is Sent to Described Hospital
 * When a doctor registers, the request is sent to the target hospital.
 */
exports.onDoctorRegistrationSubmitted = functions.firestore
  .document('doctors/{doctorId}')
  .onCreate(async (snap, context) => {
    const doctor = snap.data();
    const targetHospitalId = doctor.hospitalId;

    if (!targetHospitalId) return null;

    // Fetch hospital details
    const hospDoc = await db.collection('hospitals').doc(targetHospitalId).get();
    if (!hospDoc.exists) return null;
    const hospital = hospDoc.data();
    const hospitalEmail = hospital.email || hospital.contactEmail;

    if (!hospitalEmail) return null;

    const emailSubject = `👨‍⚕️ New Doctor Registration Request: Dr. ${doctor.name}`;
    const emailBody = `Dear ${hospital.hospitalName || hospital.name} Management,\n\n` +
      `Dr. ${doctor.name} (${doctor.specialization}, License: ${doctor.medicalLicenseNumber}) has registered and requested to join your hospital.\n\n` +
      `The request has been sent to your hospital. Please log in to your hospital dashboard to review and accept the doctor so they can begin receiving patient appointments. You can also make the doctor hold activities if any changes are needed.\n\n` +
      `Doctor Details:\n` +
      `• Name: Dr. ${doctor.name}\n` +
      `• Specialization: ${doctor.specialization}\n` +
      `• Qualifications: ${doctor.qualifications || doctor.ugDegree}\n` +
      `• Experience: ${doctor.yearsOfExperience || 0} years\n` +
      `• License Number: ${doctor.medicalLicenseNumber}\n\n` +
      `Best regards,\n` +
      `Medical Registry System`;

    return sendNotificationEmail({
      to: hospitalEmail,
      from: ADMIN_EMAIL,
      subject: emailSubject,
      text: emailBody,
      metadata: { event: 'doctor_registration_request', doctorId: context.params.doctorId, hospitalId: targetHospitalId },
    });
  });

/**
 * 4. TRIGGER: Hospital Approves Doctor Registration or Places on Hold
 * When the hospital accepts the doctor to receive appointments, or holds activities.
 */
exports.onHospitalDoctorApprovalChanged = functions.firestore
  .document('doctors/{doctorId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const doctorEmail = after.email;
    const doctorName = after.name;
    const hospitalName = after.hospitalName || 'Your Affiliated Hospital';

    if (!doctorEmail) return null;

    // Case A: Doctor Newly Approved
    if (before.approvalStatus !== 'approved' && after.approvalStatus === 'approved') {
      const emailSubject = `✅ Registration Accepted by ${hospitalName} - You Can Now Receive Appointments`;
      const emailBody = `Dear Dr. ${doctorName},\n\n` +
        `Your request to join ${hospitalName} has been accepted by the hospital administration.\n\n` +
        `You are now officially authorized to receive patient appointments, conduct consultations, and issue electronic prescriptions.\n\n` +
        `Please log in to your Doctor Portal to configure your consultation slots and view appointments.\n\n` +
        `Best regards,\n` +
        `${hospitalName} Administration`;

      return sendNotificationEmail({
        to: doctorEmail,
        from: ADMIN_EMAIL,
        subject: emailSubject,
        text: emailBody,
        metadata: { event: 'hospital_approved_doctor', doctorId: context.params.doctorId },
      });
    }

    // Case B: Doctor Placed on Hold by Hospital
    if (before.approvalStatus !== 'on_hold' && after.approvalStatus === 'on_hold') {
      const reason = after.rejectionReason || 'Administrative update or credential verification in progress.';
      const emailSubject = `⚠️ Doctor Activities Placed on Hold - ${hospitalName}`;
      const emailBody = `Dear Dr. ${doctorName},\n\n` +
        `Your clinical activities at ${hospitalName} have been temporarily placed ON HOLD by hospital management.\n\n` +
        `Reason / Notes: ${reason}\n\n` +
        `While on hold, your profile is paused from receiving new patient appointments until required changes are updated and the hold is lifted by hospital administration.\n\n` +
        `Best regards,\n` +
        `${hospitalName} Administration`;

      return sendNotificationEmail({
        to: doctorEmail,
        from: ADMIN_EMAIL,
        subject: emailSubject,
        text: emailBody,
        metadata: { event: 'doctor_placed_on_hold', doctorId: context.params.doctorId },
      });
    }

    return null;
  });

/**
 * 5. TRIGGER: Doctor Hospital Transfer Workflow
 * When doctor requests transfer to another hospital, and when target hospital accepts transfer.
 */
exports.onDoctorTransferRequested = functions.firestore
  .document('transfer_requests/{requestId}')
  .onCreate(async (snap, context) => {
    const req = snap.data();
    const targetHospDoc = await db.collection('hospitals').doc(req.targetHospitalId).get();
    if (!targetHospDoc.exists) return null;
    const targetHosp = targetHospDoc.data();
    const targetEmail = targetHosp.email || targetHosp.contactEmail;

    if (!targetEmail) return null;

    const emailSubject = `🏥 Transfer Request: Dr. ${req.doctorName} requesting transfer to ${targetHosp.hospitalName || targetHosp.name}`;
    const emailBody = `Dear ${targetHosp.hospitalName || targetHosp.name} Management,\n\n` +
      `Dr. ${req.doctorName} (${req.specialization}, Medical License: ${req.medicalLicenseNumber}), currently affiliated with ${req.currentHospitalName}, has submitted a request to transfer to your hospital.\n\n` +
      `Reason for transfer: ${req.reason || 'Career / Location change'}\n\n` +
      `Please log in to your Hospital Portal to review and accept or decline this transfer request. If accepted, Dr. ${req.doctorName} will be transferred to your hospital.\n\n` +
      `Best regards,\n` +
      `Medical Registry System`;

    return sendNotificationEmail({
      to: targetEmail,
      from: ADMIN_EMAIL,
      subject: emailSubject,
      text: emailBody,
      metadata: { event: 'doctor_transfer_requested', requestId: context.params.requestId },
    });
  });

exports.onDoctorTransferStatusUpdated = functions.firestore
  .document('transfer_requests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'accepted' && after.status === 'accepted') {
      const emailSubject = `🎉 Hospital Transfer Accepted - Welcome to ${after.targetHospitalName}`;
      const emailBody = `Dear Dr. ${after.doctorName},\n\n` +
        `Your transfer request to ${after.targetHospitalName} has been officially accepted by their administration!\n\n` +
        `Your hospital affiliation has been transferred from ${after.currentHospitalName} to ${after.targetHospitalName}. You can now receive appointments under your new hospital.\n\n` +
        `Best regards,\n` +
        `${after.targetHospitalName} Management`;

      // Update doctor's record in Firestore
      await db.collection('doctors').doc(after.doctorId).update({
        hospitalId: after.targetHospitalId,
        hospitalName: after.targetHospitalName,
        approvalStatus: 'approved',
        status: 'active',
        pendingTransfer: admin.firestore.FieldValue.delete(),
      });

      return sendNotificationEmail({
        to: after.doctorEmail,
        from: ADMIN_EMAIL,
        subject: emailSubject,
        text: emailBody,
        metadata: { event: 'doctor_transfer_accepted', requestId: context.params.requestId },
      });
    }

    return null;
  });
