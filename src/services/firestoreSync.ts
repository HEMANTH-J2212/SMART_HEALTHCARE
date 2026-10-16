import { db } from './firebaseAuth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { User, Appointment, DoctorLeaveRequest } from '../types';

export interface FirestoreDocumentRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  documentType: string;
  documentTitle: string;
  documentNumber?: string;
  fileData?: string;
  fileName?: string;
  uploadedAt: string;
  status: 'verified' | 'pending' | 'rejected';
}

/**
 * Synchronizes an individual user's complete profile and identification documents to Cloud Firestore.
 * User requirement: in the collections, give the 4 distinct user collections:
 * - Admin
 * - Hospitals
 * - Patients
 * - Doctor
 * Users are stored in their respective dedicated collection as well as central 'users'.
 */
export async function syncUserToFirestore(user: User): Promise<boolean> {
  if (!db) {
    console.warn('[Firestore] Firebase Firestore not initialized.');
    return false;
  }

  try {
    const sanitizedUser = JSON.parse(JSON.stringify(user));
    const payload = {
      ...sanitizedUser,
      syncedToFirestoreAt: new Date().toISOString(),
      lastUpdated: serverTimestamp(),
    };

    // 1. Central 'users' collection
    await setDoc(doc(db, 'users', user.id), payload, { merge: true });

    // 2. User Requirement: Four distinct dedicated collections for separate view in Firebase Console
    if (user.role === 'admin') {
      await setDoc(doc(db, 'Admin', user.id), payload, { merge: true });
      await setDoc(doc(db, 'admins', user.id), payload, { merge: true });
    } else if (user.role === 'hospital') {
      await setDoc(doc(db, 'Hospitals', user.id), payload, { merge: true });
      await setDoc(doc(db, 'hospitals', user.id), payload, { merge: true });
    } else if (user.role === 'patient') {
      await setDoc(doc(db, 'Patients', user.id), payload, { merge: true });
      await setDoc(doc(db, 'patients', user.id), payload, { merge: true });
    } else if (user.role === 'doctor') {
      await setDoc(doc(db, 'Doctor', user.id), payload, { merge: true });
      await setDoc(doc(db, 'doctors', user.id), payload, { merge: true });
    }

    // If user has uploaded documents, also index them into the central 'documents' collection in Firestore
    if (user.uploadedDocuments && user.uploadedDocuments.length > 0) {
      for (const uDoc of user.uploadedDocuments) {
        const docRef = doc(db, 'documents', `${user.id}_${uDoc.id}`);
        await setDoc(
          docRef,
          {
            id: uDoc.id,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            documentType: uDoc.type,
            documentTitle: uDoc.name,
            documentUrl: uDoc.url || '',
            uploadedAt: uDoc.uploadedAt || new Date().toISOString(),
            status: user.status === 'active' ? 'verified' : 'pending',
            syncedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    }

    console.log(`[Firestore] Successfully synced user ${user.id} (${user.name}) to 'users' and '${user.role}' collection.`);
    return true;
  } catch (err: any) {
    console.warn(`[Firestore] Sync notice for user ${user.id}:`, err.message);
    return false;
  }
}

/**
 * Deletes a user document across all user collections in Cloud Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const targets = ['users', 'Admin', 'admins', 'Hospitals', 'hospitals', 'Patients', 'patients', 'Doctor', 'doctors'];
    for (const col of targets) {
      try {
        await deleteDoc(doc(db, col, userId));
      } catch {
        // ignore missing
      }
    }
    return true;
  } catch (err: any) {
    console.warn(`[Firestore] Error deleting user ${userId}:`, err.message);
    return false;
  }
}

/**
 * Deletes a specific record by collection name and document id in Cloud Firestore
 */
export async function deleteFirestoreRecord(collectionName: string, id: string): Promise<boolean> {
  if (!db) return false;
  try {
    if (['users', 'hospitals', 'doctors', 'patients'].includes(collectionName)) {
      return await deleteUserFromFirestore(id);
    }
    await deleteDoc(doc(db, collectionName, id));
    return true;
  } catch (err: any) {
    console.warn(`[Firestore] Error deleting record ${id} from ${collectionName}:`, err.message);
    return false;
  }
}

/**
 * Clean & Reset all collections in Cloud Firestore to zero state.
 * Preserves Master Administrator HEMANTH in 'Admin' and 'users'.
 */
export async function clearFirestoreDatabase(keepAdminOnly: boolean = true): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (!db) return { success: false, deletedCount: 0, error: 'Firestore is not initialized' };

  let deletedCount = 0;
  const collectionsToClean = [
    'Hospitals',
    'hospitals',
    'Doctor',
    'doctors',
    'Patients',
    'patients',
    'appointments',
    'emergencies',
    'prescriptions',
    'iot_readings',
    'healthcare_items',
    'scheduled_surgeries',
    'doctor_leaves',
    'patient_requests',
    'documents',
    'users',
    'Admin',
    'admins',
  ];

  try {
    for (const colName of collectionsToClean) {
      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        for (const docItem of snap.docs) {
          const data = docItem.data();
          const isMasterAdmin =
            keepAdminOnly &&
            (docItem.id === 'admin-hemanth' ||
             docItem.id === 'user-admin' ||
             (data && (data.role === 'admin' || (data.email && data.email.toLowerCase().includes('hemanth')))));
          if (isMasterAdmin && (colName === 'Admin' || colName === 'admins' || colName === 'users')) {
            // Keep admin
            continue;
          }
          await deleteDoc(doc(db, colName, docItem.id));
          deletedCount++;
        }
      } catch (colErr: any) {
        console.warn(`[Firestore] Notice while clearing ${colName}:`, colErr.message);
      }
    }
    return { success: true, deletedCount };
  } catch (err: any) {
    return { success: false, deletedCount, error: err.message };
  }
}

/**
 * Syncs a single standalone document record to Firestore collection 'documents'
 */
export async function syncDocumentRecordToFirestore(docRecord: FirestoreDocumentRecord): Promise<boolean> {
  if (!db) return false;
  try {
    const docRef = doc(db, 'documents', docRecord.id);
    await setDoc(
      docRef,
      {
        ...docRecord,
        syncedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Document sync notice:', err.message);
    return false;
  }
}

/**
 * Syncs an appointment to Firestore collection 'appointments'
 */
export async function syncAppointmentToFirestore(apt: Appointment): Promise<boolean> {
  if (!db) return false;
  try {
    const aptRef = doc(db, 'appointments', apt.id);
    const sanitized = JSON.parse(JSON.stringify(apt));
    await setDoc(
      aptRef,
      {
        ...sanitized,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Appointment sync notice:', err.message);
    return false;
  }
}

/**
 * Syncs doctor leave requests to Firestore
 */
export async function syncDoctorLeaveToFirestore(leave: DoctorLeaveRequest): Promise<boolean> {
  if (!db) return false;
  try {
    const leaveRef = doc(db, 'doctor_leaves', leave.id);
    await setDoc(
      leaveRef,
      {
        ...leave,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Leave request sync notice:', err.message);
    return false;
  }
}

/**
 * Syncs an emergency alert to Firestore collection 'emergencies'
 */
export async function syncEmergencyToFirestore(emergency: any): Promise<boolean> {
  if (!db) return false;
  try {
    const emgRef = doc(db, 'emergencies', emergency.id);
    const sanitized = JSON.parse(JSON.stringify(emergency));
    await setDoc(
      emgRef,
      {
        ...sanitized,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Emergency sync notice:', err.message);
    return false;
  }
}

/**
 * Syncs a patient doctor request to Firestore collection 'patient_requests'
 */
export async function syncPatientRequestToFirestore(request: any): Promise<boolean> {
  if (!db) return false;
  try {
    const reqRef = doc(db, 'patient_requests', request.id);
    const sanitized = JSON.parse(JSON.stringify(request));
    await setDoc(
      reqRef,
      {
        ...sanitized,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Patient request sync notice:', err.message);
    return false;
  }
}

/**
 * Syncs a prescription to Firestore collection 'prescriptions'
 */
export async function syncPrescriptionToFirestore(rx: any): Promise<boolean> {
  if (!db) return false;
  try {
    const rxRef = doc(db, 'prescriptions', rx.id);
    const sanitized = JSON.parse(JSON.stringify(rx));
    await setDoc(
      rxRef,
      {
        ...sanitized,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Prescription sync notice:', err.message);
    return false;
  }
}

/**
 * Syncs an IoT reading to Firestore collection 'iot_readings'
 */
export async function syncIoTReadingToFirestore(reading: any): Promise<boolean> {
  if (!db) return false;
  try {
    const rRef = doc(db, 'iot_readings', reading.id);
    const sanitized = JSON.parse(JSON.stringify(reading));
    await setDoc(
      rRef,
      {
        ...sanitized,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Firestore] IoT reading sync notice:', err.message);
    return false;
  }
}

/**
 * Syncs a healthcare item to Firestore collection 'healthcare_items'
 */
export async function syncHealthcareItemToFirestore(item: any): Promise<boolean> {
  if (!db) return false;
  try {
    const itemRef = doc(db, 'healthcare_items', item.id);
    const sanitized = JSON.parse(JSON.stringify(item));
    await setDoc(itemRef, { ...sanitized, syncedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Item sync notice:', err.message);
    return false;
  }
}

/**
 * Syncs a scheduled surgery to Firestore collection 'scheduled_surgeries'
 */
export async function syncScheduledSurgeryToFirestore(surg: any): Promise<boolean> {
  if (!db) return false;
  try {
    const surgRef = doc(db, 'scheduled_surgeries', surg.id);
    const sanitized = JSON.parse(JSON.stringify(surg));
    await setDoc(surgRef, { ...sanitized, syncedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Surgery sync notice:', err.message);
    return false;
  }
}

/**
 * Live test to verify if Cloud Firestore rules permit reads and writes
 */
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  permissionGranted: boolean;
  error?: string;
  projectId: string;
}> {
  if (!db) {
    return {
      connected: false,
      permissionGranted: false,
      error: 'Firestore client not initialized',
      projectId: 'smart-health-management-6cc87',
    };
  }

  try {
    const probeRef = doc(db, '_system_health', 'probe');
    await setDoc(
      probeRef,
      {
        ping: true,
        timestamp: new Date().toISOString(),
        client: 'smart-health-management',
      },
      { merge: true }
    );
    return {
      connected: true,
      permissionGranted: true,
      projectId: 'smart-health-management-6cc87',
    };
  } catch (err: any) {
    const isPermissionDenied =
      err.code === 'permission-denied' ||
      (err.message && err.message.toLowerCase().includes('permission'));
    return {
      connected: true,
      permissionGranted: false,
      error: isPermissionDenied
        ? 'Missing or insufficient permissions: Firestore security rules are locked (allow read, write: if false;)'
        : err.message,
      projectId: 'smart-health-management-6cc87',
    };
  }
}

/**
 * Syncs all current in-memory ecosystem records into Cloud Firestore.
 * User requirement: When clean reset is run and live data pushed, stale records must not persist.
 * Storing data across:
 * - Admin
 * - Hospitals
 * - Patients
 * - Doctor
 * and central collections.
 */
export async function syncEntireEcosystemToFirestore(
  snapshot: any,
  pruneOrphans: boolean = true
): Promise<{
  success: boolean;
  syncedCount: number;
  permissionDenied?: boolean;
  error?: string;
  details?: Record<string, number>;
}> {
  if (!db) {
    return { success: false, syncedCount: 0, error: 'Cloud Firestore is not initialized' };
  }

  // Probe Firestore rules permission first
  const testRes = await testFirestoreConnection();
  if (!testRes.permissionGranted) {
    return {
      success: false,
      syncedCount: 0,
      permissionDenied: true,
      error: 'PERMISSION_DENIED: Cloud Firestore security rules in your Firebase Console are currently blocking writes. In the Rules tab, update to allow read, write: if true; and click Publish.',
    };
  }

  let count = 0;
  const details: Record<string, number> = {
    users: 0,
    admin: 0,
    hospitals: 0,
    patients: 0,
    doctor: 0,
    appointments: 0,
    emergencies: 0,
    prescriptions: 0,
    iotReadings: 0,
    patientRequests: 0,
    doctorLeaves: 0,
    items: 0,
    scheduledSurgeries: 0,
  };

  try {
    const validUserIds = new Set<string>();

    if (snapshot.users && Array.isArray(snapshot.users)) {
      for (const u of snapshot.users) {
        validUserIds.add(u.id);
        if (await syncUserToFirestore(u)) {
          count++;
          details.users++;
          if (u.role === 'admin') details.admin++;
          else if (u.role === 'hospital') details.hospitals++;
          else if (u.role === 'patient') details.patients++;
          else if (u.role === 'doctor') details.doctor++;
        }
      }
    }

    // If pruneOrphans is enabled, delete any documents in Firestore collections that are no longer in snapshot
    if (pruneOrphans) {
      const collectionsToCheck = [
        'users',
        'Admin',
        'admins',
        'Hospitals',
        'hospitals',
        'Patients',
        'patients',
        'Doctor',
        'doctors',
      ];
      for (const cName of collectionsToCheck) {
        try {
          const snap = await getDocs(collection(db, cName));
          for (const docItem of snap.docs) {
            if (!validUserIds.has(docItem.id)) {
              await deleteDoc(doc(db, cName, docItem.id));
            }
          }
        } catch (e: any) {
          console.warn(`[Firestore] Prune check notice for ${cName}:`, e.message);
        }
      }
    }

    if (snapshot.appointments && Array.isArray(snapshot.appointments)) {
      for (const a of snapshot.appointments) {
        if (await syncAppointmentToFirestore(a)) { count++; details.appointments++; }
      }
    }
    const emgList = snapshot.emergencies || snapshot.emergencyAlerts;
    if (emgList && Array.isArray(emgList)) {
      for (const e of emgList) {
        if (await syncEmergencyToFirestore(e)) { count++; details.emergencies++; }
      }
    }
    if (snapshot.prescriptions && Array.isArray(snapshot.prescriptions)) {
      for (const p of snapshot.prescriptions) {
        if (await syncPrescriptionToFirestore(p)) { count++; details.prescriptions++; }
      }
    }
    if (snapshot.iotReadings && Array.isArray(snapshot.iotReadings)) {
      for (const r of snapshot.iotReadings) {
        if (await syncIoTReadingToFirestore(r)) { count++; details.iotReadings++; }
      }
    }
    const reqList = snapshot.patientRequests || snapshot.patientDoctorRequests;
    if (reqList && Array.isArray(reqList)) {
      for (const req of reqList) {
        if (await syncPatientRequestToFirestore(req)) { count++; details.patientRequests++; }
      }
    }
    const leavesList = snapshot.doctorLeaves || snapshot.doctorLeaveRequests;
    if (leavesList && Array.isArray(leavesList)) {
      for (const l of leavesList) {
        if (await syncDoctorLeaveToFirestore(l)) { count++; details.doctorLeaves++; }
      }
    }
    const itemsList = snapshot.items || snapshot.healthcareItems;
    if (itemsList && Array.isArray(itemsList)) {
      for (const it of itemsList) {
        if (await syncHealthcareItemToFirestore(it)) { count++; details.items++; }
      }
    }
    if (snapshot.scheduledSurgeries && Array.isArray(snapshot.scheduledSurgeries)) {
      for (const s of snapshot.scheduledSurgeries) {
        if (await syncScheduledSurgeryToFirestore(s)) { count++; details.scheduledSurgeries++; }
      }
    }

    return { success: true, syncedCount: count, details };
  } catch (err: any) {
    return { success: false, syncedCount: count, error: err.message, details };
  }
}

export const syncFullEcosystemToFirestore = syncEntireEcosystemToFirestore;

/**
 * Syncs all current in-memory ecosystem users and documents into Cloud Firestore
 */
export async function syncAllUsersToFirestore(users: User[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (!db) {
    return { success: false, count: 0, error: 'Cloud Firestore is not initialized' };
  }

  let successCount = 0;
  try {
    for (const u of users) {
      const ok = await syncUserToFirestore(u);
      if (ok) successCount++;
    }
    return { success: true, count: successCount };
  } catch (err: any) {
    return { success: false, count: successCount, error: err.message };
  }
}

/**
 * Reads all documents from Cloud Firestore 'users' collection
 */
export async function fetchUsersFromFirestore(): Promise<any[]> {
  if (!db) return [];
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err: any) {
    console.warn('[Firestore] Error reading users:', err.message);
    return [];
  }
}

/**
 * Reads all documents from Cloud Firestore 'documents' collection
 */
export async function fetchDocumentsFromFirestore(): Promise<any[]> {
  if (!db) return [];
  try {
    const docsCol = collection(db, 'documents');
    const snapshot = await getDocs(docsCol);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err: any) {
    console.warn('[Firestore] Error reading documents:', err.message);
    return [];
  }
}
