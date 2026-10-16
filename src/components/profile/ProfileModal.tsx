import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Activity,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Building2,
  Lock,
  LogOut,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  MapPin,
  FileBadge
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MEDICAL_SPECIALIZATIONS } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGoogleChange: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenGoogleChange,
}) => {
  const { user, updateProfile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'danger'>('profile');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Common editable fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Patient profile fields
  const [patientGovtIdType, setPatientGovtIdType] = useState(user?.patientProfile?.govtIdType || 'Aadhar Card');
  const [patientGovtIdNumber, setPatientGovtIdNumber] = useState(user?.patientProfile?.govtIdNumber || '');
  const [patientDob, setPatientDob] = useState(user?.patientProfile?.dateOfBirth || '1990-01-01');
  const [patientGender, setPatientGender] = useState(user?.patientProfile?.gender || 'male');
  const [patientHeight, setPatientHeight] = useState(user?.patientProfile?.heightCm || 170);
  const [patientWeight, setPatientWeight] = useState(user?.patientProfile?.weightKg || 70);
  const [patientBloodGroup, setPatientBloodGroup] = useState(user?.patientProfile?.bloodGroup || 'O+');
  const [patientStreet, setPatientStreet] = useState(user?.patientProfile?.streetAddress || '');
  const [patientCity, setPatientCity] = useState(user?.patientProfile?.city || '');
  const [patientState, setPatientState] = useState(user?.patientProfile?.state || '');
  const [patientPincode, setPatientPincode] = useState(user?.patientProfile?.pincode || '');
  const [patientConditions, setPatientConditions] = useState<string[]>(user?.patientProfile?.existingConditions || []);
  const [patientAllergies, setPatientAllergies] = useState<string[]>(user?.patientProfile?.allergies || []);
  const [patientMeds, setPatientMeds] = useState(user?.patientProfile?.currentMedications?.join(', ') || '');
  const [emgName, setEmgName] = useState(user?.patientProfile?.emergencyContact?.name || '');
  const [emgPhone, setEmgPhone] = useState(user?.patientProfile?.emergencyContact?.phone || '');
  const [emgRel, setEmgRel] = useState(user?.patientProfile?.emergencyContact?.relationship || 'Spouse');

  // Doctor profile fields
  const [docGovtIdNumber, setDocGovtIdNumber] = useState(user?.doctorProfile?.govtIdNumber || '');
  const [docLicense, setDocLicense] = useState(user?.doctorProfile?.medicalLicenseNumber || '');
  const [docSpecialization, setDocSpecialization] = useState(user?.doctorProfile?.specialization || 'Cardiology (Heart & Blood Vessels)');
  const [docUgDegree, setDocUgDegree] = useState(user?.doctorProfile?.ugDegree || 'MBBS');
  const [docPgDegree, setDocPgDegree] = useState(user?.doctorProfile?.pgDegree || '');
  const [docGradCollege, setDocGradCollege] = useState(user?.doctorProfile?.graduatingCollege || '');
  const [docPassYear, setDocPassYear] = useState(user?.doctorProfile?.passingYear || '');
  const [docFee, setDocFee] = useState(user?.doctorProfile?.consultationFee || 70);
  const [docExp, setDocExp] = useState(user?.doctorProfile?.yearsOfExperience || 8);
  const [docBio, setDocBio] = useState(user?.doctorProfile?.bio || '');

  // Hospital profile fields
  const [hospName, setHospName] = useState(user?.hospitalProfile?.hospitalName || user?.name || '');
  const [hospLicense, setHospLicense] = useState(user?.hospitalProfile?.licenseNumber || '');
  const [hospAccreditation, setHospAccreditation] = useState(user?.hospitalProfile?.accreditation || '');
  const [hospHotline, setHospHotline] = useState(user?.hospitalProfile?.emergencyHotline || '');
  const [hospBeds, setHospBeds] = useState(user?.hospitalProfile?.totalBeds || 300);
  const [hospIcuBeds, setHospIcuBeds] = useState(user?.hospitalProfile?.icuBeds || 40);
  const [hospAddress, setHospAddress] = useState(user?.hospitalProfile?.address || '');
  const [hospCity, setHospCity] = useState(user?.hospitalProfile?.city || '');
  const [hospState, setHospState] = useState(user?.hospitalProfile?.state || '');
  const [hospPincode, setHospPincode] = useState(user?.hospitalProfile?.pincode || '');

  // Keep state updated when user or isOpen changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
      if (user.patientProfile) {
        setPatientGovtIdType(user.patientProfile.govtIdType || 'Aadhar Card');
        setPatientGovtIdNumber(user.patientProfile.govtIdNumber || '');
        setPatientDob(user.patientProfile.dateOfBirth || '1990-01-01');
        setPatientGender(user.patientProfile.gender || 'male');
        setPatientHeight(user.patientProfile.heightCm || 170);
        setPatientWeight(user.patientProfile.weightKg || 70);
        setPatientBloodGroup(user.patientProfile.bloodGroup || 'O+');
        setPatientStreet(user.patientProfile.streetAddress || '');
        setPatientCity(user.patientProfile.city || '');
        setPatientState(user.patientProfile.state || '');
        setPatientPincode(user.patientProfile.pincode || '');
        setPatientConditions(user.patientProfile.existingConditions || []);
        setPatientAllergies(user.patientProfile.allergies || []);
        setPatientMeds(user.patientProfile.currentMedications?.join(', ') || '');
        setEmgName(user.patientProfile.emergencyContact?.name || '');
        setEmgPhone(user.patientProfile.emergencyContact?.phone || '');
        setEmgRel(user.patientProfile.emergencyContact?.relationship || 'Spouse');
      }
      if (user.doctorProfile) {
        setDocGovtIdNumber(user.doctorProfile.govtIdNumber || '');
        setDocLicense(user.doctorProfile.medicalLicenseNumber || '');
        setDocSpecialization(user.doctorProfile.specialization || 'Cardiology (Heart & Blood Vessels)');
        setDocUgDegree(user.doctorProfile.ugDegree || 'MBBS');
        setDocPgDegree(user.doctorProfile.pgDegree || '');
        setDocGradCollege(user.doctorProfile.graduatingCollege || '');
        setDocPassYear(user.doctorProfile.passingYear || '');
        setDocFee(user.doctorProfile.consultationFee || 70);
        setDocExp(user.doctorProfile.yearsOfExperience || 8);
        setDocBio(user.doctorProfile.bio || '');
      }
      if (user.hospitalProfile) {
        setHospName(user.hospitalProfile.hospitalName || user.name || '');
        setHospLicense(user.hospitalProfile.licenseNumber || '');
        setHospAccreditation(user.hospitalProfile.accreditation || '');
        setHospHotline(user.hospitalProfile.emergencyHotline || '');
        setHospBeds(user.hospitalProfile.totalBeds || 300);
        setHospIcuBeds(user.hospitalProfile.icuBeds || 40);
        setHospAddress(user.hospitalProfile.address || '');
        setHospCity(user.hospitalProfile.city || '');
        setHospState(user.hospitalProfile.state || '');
        setHospPincode(user.hospitalProfile.pincode || '');
      }
    }
  }, [user, isOpen]);

  // Auto calculated BMI
  const calculatedBmi = patientHeight > 0
    ? (patientWeight / Math.pow(patientHeight / 100, 2)).toFixed(1)
    : '0.0';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccessMsg(null);

    try {
      const payload: any = {
        name,
        phone,
        avatarUrl,
      };

      if (user.role === 'patient') {
        payload.patientProfile = {
          ...user.patientProfile,
          govtIdType: patientGovtIdType,
          govtIdNumber: patientGovtIdNumber,
          dateOfBirth: patientDob,
          gender: patientGender,
          heightCm: Number(patientHeight),
          weightKg: Number(patientWeight),
          bmi: Number(calculatedBmi),
          bloodGroup: patientBloodGroup,
          streetAddress: patientStreet,
          city: patientCity,
          state: patientState,
          pincode: patientPincode,
          existingConditions: patientConditions,
          allergies: patientAllergies,
          currentMedications: patientMeds ? patientMeds.split(',').map((s) => s.trim()) : [],
          emergencyContact: {
            name: emgName,
            relationship: emgRel,
            phone: emgPhone,
          },
        };
      } else if (user.role === 'doctor') {
        payload.doctorProfile = {
          ...user.doctorProfile,
          govtIdNumber: docGovtIdNumber,
          medicalLicenseNumber: docLicense,
          specialization: docSpecialization,
          ugDegree: docUgDegree,
          pgDegree: docPgDegree,
          graduatingCollege: docGradCollege,
          passingYear: docPassYear,
          qualifications: `${docUgDegree}${docPgDegree ? ', ' + docPgDegree : ''}`,
          consultationFee: Number(docFee),
          yearsOfExperience: Number(docExp),
          bio: docBio,
        };
      } else if (user.role === 'hospital') {
        payload.hospitalProfile = {
          ...user.hospitalProfile,
          hospitalName: hospName,
          licenseNumber: hospLicense,
          accreditation: hospAccreditation,
          emergencyHotline: hospHotline,
          totalBeds: Number(hospBeds),
          icuBeds: Number(hospIcuBeds),
          address: hospAddress,
          city: hospCity,
          state: hospState,
          pincode: hospPincode,
        };
      }

      await updateProfile(payload);
      setSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    logout();
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{user.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800">
                  {user.role}
                </span>
                {user.doctorProfile?.approvalStatus === 'on_hold' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                    On Hold
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mt-4 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-b-2 border-teal-700 text-teal-800 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Profile & Identification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'border-b-2 border-teal-700 text-teal-800 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Google Account & Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`pb-2.5 transition-colors cursor-pointer ${
              activeTab === 'danger'
                ? 'border-b-2 border-rose-600 text-rose-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Account Actions / Sign Out
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-4 max-h-[65vh] overflow-y-auto">
          {successMsg && (
            <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PROFILE FORM */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* PATIENT SPECIFIC DETAILS */}
              {user.role === 'patient' && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-teal-800 text-xs">
                    <CreditCard className="w-4 h-4 text-teal-600" />
                    <span>Government ID & Aadhaar Records</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">ID Document Type</label>
                      <select
                        value={patientGovtIdType}
                        onChange={(e: any) => setPatientGovtIdType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="Aadhar Card">Aadhaar Card (12-Digit)</option>
                        <option value="Passport">Passport</option>
                        <option value="Driver License">Driver's License</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="National ID">National ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{patientGovtIdType} Number</label>
                      <input
                        type="text"
                        value={patientGovtIdNumber}
                        onChange={(e) => setPatientGovtIdNumber(e.target.value)}
                        placeholder="XXXX XXXX XXXX"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={patientDob}
                        onChange={(e) => setPatientDob(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                      <select
                        value={patientGender}
                        onChange={(e: any) => setPatientGender(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Blood Group</label>
                      <select
                        value={patientBloodGroup}
                        onChange={(e) => setPatientBloodGroup(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Height (cm)</label>
                      <input
                        type="number"
                        value={patientHeight}
                        onChange={(e) => setPatientHeight(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        value={patientWeight}
                        onChange={(e) => setPatientWeight(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">BMI</label>
                      <div className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl font-bold text-teal-800">
                        {calculatedBmi} kg/m²
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Street Address</label>
                      <input
                        type="text"
                        value={patientStreet}
                        onChange={(e) => setPatientStreet(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">City / State</label>
                      <input
                        type="text"
                        value={patientCity}
                        onChange={(e) => setPatientCity(e.target.value)}
                        placeholder="City"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Pincode</label>
                      <input
                        type="text"
                        value={patientPincode}
                        onChange={(e) => setPatientPincode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 block">Emergency Contact (SOS Dispatch)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={emgName}
                        onChange={(e) => setEmgName(e.target.value)}
                        placeholder="Contact Name"
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={emgRel}
                        onChange={(e) => setEmgRel(e.target.value)}
                        placeholder="Relationship"
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="tel"
                        value={emgPhone}
                        onChange={(e) => setEmgPhone(e.target.value)}
                        placeholder="Emergency Phone"
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DOCTOR SPECIFIC DETAILS */}
              {user.role === 'doctor' && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-800 text-xs">
                    <FileBadge className="w-4 h-4 text-indigo-600" />
                    <span>Physician Credentials & Licensing</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Medical License Number</label>
                      <input
                        type="text"
                        value={docLicense}
                        onChange={(e) => setDocLicense(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Doctor ID / Aadhaar No.</label>
                      <input
                        type="text"
                        value={docGovtIdNumber}
                        onChange={(e) => setDocGovtIdNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Specialization</label>
                    <select
                      value={docSpecialization}
                      onChange={(e) => setDocSpecialization(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      {MEDICAL_SPECIALIZATIONS.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">UG / PG Degree</label>
                      <input
                        type="text"
                        value={docUgDegree}
                        onChange={(e) => setDocUgDegree(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Years of Experience</label>
                      <input
                        type="number"
                        value={docExp}
                        onChange={(e) => setDocExp(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Consultation Fee ($ / ₹)</label>
                      <input
                        type="number"
                        value={docFee}
                        onChange={(e) => setDocFee(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Hospital Affiliation</label>
                      <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 font-medium">
                        {user.doctorProfile?.hospitalName || 'Unassigned Hospital'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* HOSPITAL SPECIFIC DETAILS */}
              {user.role === 'hospital' && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>Hospital Capacity & Accreditation</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Hospital Registration Name</label>
                      <input
                        type="text"
                        value={hospName}
                        onChange={(e) => setHospName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">License Number</label>
                      <input
                        type="text"
                        value={hospLicense}
                        onChange={(e) => setHospLicense(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Emergency 24x7 Hotline</label>
                      <input
                        type="text"
                        value={hospHotline}
                        onChange={(e) => setHospHotline(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-700"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Total Inpatient Beds</label>
                      <input
                        type="number"
                        value={hospBeds}
                        onChange={(e) => setHospBeds(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">ICU Critical Beds</label>
                      <input
                        type="number"
                        value={hospIcuBeds}
                        onChange={(e) => setHospIcuBeds(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY & GOOGLE ACCOUNT */}
          {activeTab === 'security' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Google Authentication Account</p>
                      <p className="text-slate-500 font-mono text-[11px]">{user.email}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-teal-100 text-teal-800 font-bold rounded-full text-[10px]">
                    Linked & Active
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed">
                  You can change or switch to another Google account on this device or add a new Google email to access your medical records or doctor portal.
                </p>

                <button
                  type="button"
                  onClick={onOpenGoogleChange}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Change Google Account / Switch Account
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LOGOUT / DANGER */}
          {activeTab === 'danger' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Sign Out of Current Session</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    End your active session securely. You must sign back in to access this role.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="px-4 py-2 bg-slate-800 hover:bg-black text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
