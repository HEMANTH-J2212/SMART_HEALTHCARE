# Doctor Consultation Economics, Comprehensive Admin Hospital Audit, and Custom Domain Deployment

This plan establishes end-to-end transparency for doctor consultation timings and fee schedules in the patient booking workflow, elevates all registered hospital infrastructure and accreditation data in the administrator portal via a tabbed inspection modal, and provides interactive in-app and documented guidance for custom domain deployment.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on your requirements and clarification answers:
> - **Patient Booking Transparency**: Full breakdown showing OPD consultation fee, follow-up fee (if configured), consultation mode (in-clinic vs video), slot duration (e.g., 15m), and shift timings/weekly days during appointment scheduling.
> - **Admin Hospital Inspection**: Multi-tabbed expandable audit modal in the Admin Dashboard covering:
>   1. **Bed Capacities & Infrastructure** (General, Semi-Private, Private, ICU, NICU, Operation Theaters, Blood Bank, Oxygen Plant).
>   2. **Facilities & Diagnostic Labs** (Emergency 24x7, In-house Pharmacy, Ambulance contacts, Imaging & Laboratory tests).
>   3. **Licensing & Accreditations** (Clinical Establishment Act registration, NABH status and certificate numbers, PAN/GSTIN, state health authority, and document previews).
> - **Custom Domain Deployment**: Both an interactive in-app guide accessible directly from the Admin settings/navigation with DNS record presets (A, CNAME, SSL verification) and a comprehensive production deployment manual (`DEPLOYMENT_CUSTOM_DOMAIN_GUIDE.md`).

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Doctor Appointment Booking Flow**: Displays clear consultation fee structures (OPD fee and follow-up fee in INR ₹), consultation format (In-Clinic Physical Visit, Video Consultation, or Both), slot duration in minutes, and weekly practice schedules alongside real-time slot selection. Patients see the exact financial and timing commitment before booking.
  2. **Comprehensive Admin Hospital Audit View**: Replaces basic summaries with an in-depth audit view. Administrators can inspect every field captured during hospital registration—including emergency hotlines, nodal officers, bed breakdown, department offerings, diagnostic lab rosters, insurance TPAs, Clinical Establishment Act numbers, and NABH credentials.
  3. **Custom Domain & Production Deployment System**: Guides the platform owner through deploying to custom domains (e.g., `healthportal.yourhospital.org` or `yourdomain.com`). Includes DNS record configurations (A records, CNAME for subdomains, TXT/CAA records), SSL/TLS certificate automation, container/VPS hosting options (Cloud Run, Docker, VPS with Nginx & Let's Encrypt), and environment variable configurations.

- **Target Audience / Persona**:
  - **Patients**: Seeking clarity on doctor charges, consultation modes, and exact slot timings prior to appointment confirmation.
  - **System Administrators**: Verifying hospital legitimacy, cross-referencing statutory licenses, and assessing clinical capacity before authorizing facilities.
  - **Platform Owner / Technical Lead**: Transitioning from the development/preview environment to production with custom domain names and automated SSL.

- **Key Value**:
  - Eliminates hidden consultation fees or timing mismatches for patients.
  - Gives admins complete visibility into hospital clinical readiness and statutory compliance.
  - Provides a definitive, actionable path for launching on custom domains.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Patient Flow: Doctor Directory / Hospital Profile]
       │
       ▼
[Click "Book Consultation" or Time Slot]
       │
       ▼
[Booking Modal Opens]
  ├── Doctor Identity & Hospital Affiliation
  ├── Consultation Economics Card (OPD Fee ₹, Follow-up Fee ₹, Mode)
  ├── Schedule & Shift Breakdown (Weekly Days, Slot Duration)
  ├── 7-Day Calendar Date Selector (Sundays & Leave/Surgeries Blocked)
  ├── Real-time Visual Time Slot Grid (Already Booked Slots Blocked)
  └── Submit Confirmation with Transparent Summary
```

```
[Admin Flow: Hospitals Tab]
       │
       ▼
[Click "Full Details & Doctors" on any Hospital]
       │
       ▼
[Comprehensive Hospital Audit Modal Opens]
  ├── Header: Legal Name, Category, Verification Status, Direct Contact
  ├── Tab 1: Clinical Bed Capacity & Departments
  │     ├── General Ward, Semi-Private, Private, ICU, NICU Bed Counts
  │     ├── Operation Theaters, Blood Bank, Oxygen Plant Indicators
  │     └── Department Badges
  ├── Tab 2: Operational Facilities & Diagnostic Labs
  │     ├── 24x7 Emergency Trauma Care & OPD Timings
  │     ├── In-House Pharmacy, Ambulance Hotline
  │     ├── Nodal Administrative Officer Details
  │     └── Diagnostic Labs & Imaging Tests Offered
  ├── Tab 3: Statutory Licensing, Trust & Documents
  │     ├── Clinical Establishment Act Reg No. & State Authority
  │     ├── NABH Accreditation & Validity
  │     ├── PAN & GSTIN Numbers
  │     └── Document Viewer (Licenses, Certificates, Affiliation Letters)
  └── Tab 4: Affiliated Physicians & Practice Rosters
```

```
[Admin Flow: Custom Domain & Deployment Center]
       │
       ▼
[Click "Deploy Custom Domain" Action in Admin Header]
       │
       ▼
[Custom Domain Setup Modal]
  ├── Domain Input Validator (e.g., app.healthportal.org)
  ├── Live DNS Record Generator (Type A, CNAME, TXT for SSL)
  ├── Step-by-Step Hosting Providers (Cloud Run, Docker VPS, Vercel/Netlify)
  ├── SSL/TLS Automatic Certificate Setup (Let's Encrypt / Google Managed SSL)
  └── Export Production Build Instructions
```

### Visual Identity & Theme
- **Theme Posture**: Crisp medical clean aesthetic using slate neutrals (`#0F172A`, `#334155`, `#F8FAFC`), surgical teal accents (`#0F766E`, `#14B8A6`), and amber/emerald semantic indicators.
- **Typography**: Display headlines in `Plus Jakarta Sans`, body prose in `DM Sans`, and numerical fees/slots/license numbers strictly formatted with tabular figures (`tabular-nums font-mono`).
- **Zero-Pill Discipline**: Metadata items separated by quiet typographic bullets (`·`), avoiding stacked colored capsules on informational cards.
- **Accessibility**: High contrast ratios ($\ge 4.5:1$) across all fee summaries, badges, and status indicators.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular Tabbed Hospital Modal in Admin**:
  - *Chosen Approach*: Group comprehensive hospital data into 4 intuitive tabs (Beds & Capacity, Facilities & Diagnostics, Statutory Licenses & Documents, Affiliated Doctors).
  - *Why*: A single flat page with 30+ fields causes cognitive overload. The tabbed design lets administrators quickly inspect specific sections during credential verification without infinite scrolling.
  - *Alternatives Considered*: Dedicated separate sub-page routing was considered, but modal overlay preserves administrative context and filter states.

- **Decision 2: Transparent Dual-Fee & Mode Display in Booking Modal**:
  - *Chosen Approach*: Display both primary OPD consultation fee and subsequent follow-up fee (if specified by doctor), alongside the consultation type (In-Clinic Physical Visit, Video Consultation, or Both), and slot duration in minutes.
  - *Why*: Patients frequently face unexpected follow-up fees or confusion about whether an appointment is physical or tele-consult. Clear economics up front builds trust and prevents scheduling disputes.
  - *Alternatives Considered*: Showing fee only on the final payment step was rejected as non-transparent.

- **Decision 3: Dual-Channel Domain Deployment Guidance**:
  - *Chosen Approach*: Provide both an interactive generator in the Admin UI (where users can input their domain and see their exact DNS records) and an exportable markdown guide (`DEPLOYMENT_CUSTOM_DOMAIN_GUIDE.md`) with server configurations.
  - *Why*: Non-technical administrators need the immediate DNS values (A and CNAME targets), while DevOps engineers need the Docker/Nginx/SSL configs.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Component Interaction

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SmartHealth Client App                          │
├───────────────────────────────────────┬────────────────────────────────┤
│           Patient Experience          │       Admin Portal             │
│  ┌─────────────────────────────────┐  │  ┌───────────────────────────┐ │
│  │ PatientDashboard.tsx            │  │  │ AdminDashboard.tsx        │ │
│  │  - Doctor Profile Card          │  │  │  - Hospitals Tab          │ │
│  │  - Fee & Timings Summary        │  │  │  - Hospital Audit Modal   │ │
│  │  - Book Consultation Modal      │  │  │    * Beds & Capacity Tab  │ │
│  │    * OPD & Follow-up Fees (₹)   │  │  │    * Facilities & Tests   │ │
│  │    * Slot Duration (15m/30m)    │  │  │    * Statutory Docs Tab   │ │
│  │    * Weekly Shift Hours         │  │  │    * Doctor Roster Tab    │ │
│  │    * Real-time Slot Picker      │  │  │  - Custom Domain Modal    │ │
│  └────────────────┬────────────────┘  │  └─────────────┬─────────────┘ │
└───────────────────┼───────────────────────────────────┼────────────────┘
                    │                                   │
                    ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API Client & Store Bridge                       │
│  - api.getDoctors() / api.getHospitals() / api.bookAppointment()       │
│  - Persistent Server Storage: data/server_storage.json                 │
│  - Real-time Firestore Sync (syncUserToFirestore)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Express Full-Stack Server (server.ts)                 │
│  - Static Asset Serving (/uploads/ for verified certificates & logos)  │
│  - Appointment Conflict Validator & Slot Reservation Endpoint          │
│  - Production SPA Routing (dist/index.html fallback)                   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Fields Mapped to UI

1. **Doctor Consultation Economics & Timings**:
   - `consultationFee`: Primary OPD consultation charge (formatted in INR ₹).
   - `followUpFee`: Reduced fee for return visits within standard review windows.
   - `consultationType`: In-Clinic Physical Visit, Video Consultation, or Both.
   - `slotDurationMinutes`: Consultation interval (e.g., 15m, 20m, 30m).
   - `weeklySchedule`: Operational days and shift hours (e.g., "Mon - Fri: 09:00 AM - 05:00 PM").
   - `customSlotTimings`: Granular hourly consulting slots.

2. **Hospital Comprehensive Data Fields**:
   - **Infrastructure**: `totalBeds`, `availableBeds`, `generalWardBeds`, `semiPrivateBeds`, `privateBeds`, `icuBeds`, `nicuBeds`, `operationTheaters`.
   - **Critical Resources**: `bloodBankAvailable`, `oxygenPlantAvailable`, `has24x7Emergency`, `hasInhousePharmacy`.
   - **Emergency & Contacts**: `emergencyHotline`, `ambulanceContact`, `contactEmail`, `contactPhone`, `nodalOfficerName`, `nodalOfficerEmail`, `nodalOfficerPhone`.
   - **Services & Labs**: `departments`, `availableLabTests` (imaging & diagnostic tests list).
   - **Compliance & Trust**: `clinicalEstablishmentRegNo`, `stateHealthAuthority`, `clinicalEstablishmentDocUrl`, `nabhCertificateNo`, `nabhValidity`, `nabhDocUrl`, `hospitalPan`, `hospitalGstin`, `panGstDocUrl`.

3. **Custom Domain Guidance Engine**:
   - **Apex Domain (`example.com`)**: A-record pointing to host IP or Cloud Run Load Balancer.
   - **Subdomain (`health.example.com`)**: CNAME-record pointing to deployment target.
   - **SSL/TLS Validation**: Automated ACME / Let's Encrypt challenge setup.
   - **Environment Configuration**: `NODE_ENV=production`, `PORT=3000`, `npm run build && npm start`.
