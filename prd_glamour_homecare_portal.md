# Product Requirement Document (PRD)

## Project Title
**Glamour Homecare Staff & Caregiver Portal**

## Version & Document Status
* **Version:** 1.0.0
* **Date:** October 20, 2026
* **Status:** Approved for Development
* **Target Host:** AWS EC2 (`t3.micro`) + AWS RDS PostgreSQL (`db.t4g.micro`)
* **Framework:** Next.js (App Router) + Prisma ORM + Better Auth
* **UI Palette:** Soft Pink & Deep Rose (`#E879F9` / `#DB2777` accent themes matching glamourhomecare.org)

---

## 1. Executive Summary & Objective

**Glamour Homecare, LLC** is a nurse-owned, non-skilled home care agency located in Fredericksburg, VA, providing Personal Care, Companion Care, and Respite Care to clients of all ages. 

This platform serves as a centralized, HIPAA-compliant internal portal enabling:
1. **Shavonnah (RN Owner/Admin)** to manage clients, assign caregivers, schedule shifts/appointments, and monitor care logs/discharge summaries in real time.
2. **Caregivers (Employees)** to quickly view assigned clients, track schedules, tap ADL completion checkboxes, and submit narrative visit notes or hospital discharge summaries on mobile devices.

### Key Constraints & Design Principles
* **Zero AI / Gimmick Artifacts:** **NO** "sparkle" icons, **NO** AI "pill bubbles," and **NO** unnecessary decorative badges. Clean, high-contrast, accessible healthcare UI.
* **Color Scheme:** Grounded in soft pinks, warm magenta/rose accents, clean white backgrounds, and deep charcoal text matching the agency's primary website brand identity.
* **Low Memory Footprint:** Built as a Next.js standalone container deployed via GitHub Actions to an AWS EC2 instance (1 GB RAM free tier). Zero memory leaks.

---

## 2. User Roles & Access Hierarchy

```
                   +------------------------+
                   |  Shavonnah (RN Owner)  |
                   |      Role: ADMIN       |
                   +-----------+------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
   +------------------+                  +------------------+
   | Employee: Martha |                  | Employee: Gloria |
   | Role: EMPLOYEE   |                  | Role: EMPLOYEE   |
   +--------+---------+                  +--------+---------+
            |                                     |
     [Assigned Clients]                    [Assigned Clients]
```

### Role 1: Admin (`ADMIN`)
* Full visibility across all clients, caregivers, shifts, and visit logs.
* Ability to create, edit, deactivate, and assign staff members and clients.
* Ability to filter notes by Category (*Daily Care Log*, *Discharge Summary*, *Medication Reminder*, *Vitals Check*, *Incident Report*).
* Ability to export/print clean clinical summary reports.

### Role 2: Employee / Caregiver (`EMPLOYEE`)
* **Strict Row-Level Isolation:** Can only view clients explicitly assigned to them.
* Can view upcoming and past scheduled shifts/medical appointment visits.
* Can submit daily care notes, complete ADL checkboxes, and enter hospital discharge text.
* Zero access to other caregivers' clients or internal system settings.

---

## 3. Core Technical Architecture & Compliance

### Stack Alignment
* **Frontend/Backend:** Next.js (App Router, Server Actions, Standalone Build).
* **Database:** AWS RDS PostgreSQL (`db.t4g.micro`, multi-AZ backup capable).
* **ORM:** Prisma ORM.
* **Authentication:** Better Auth (Database-backed sessions, disabled public sign-ups).
* **Reverse Proxy:** Caddy (Automated Let's Encrypt TLS/HTTPS).
* **CI/CD Pipeline:** GitHub Actions (Builds standalone image on 7 GB runner; zero EC2 CPU spikes during builds).
* **HIPAA Compliance:** Free AWS BAA executed via AWS Artifact; encrypted at rest (AES-256) and in transit (TLS 1.3).

---

## 4. Complete Database Schema (Prisma Syntax)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ------------------------------------------------------
// ENUMS
// ------------------------------------------------------

enum Role {
  ADMIN
  EMPLOYEE
}

enum CareType {
  PERSONAL_CARE
  COMPANION_CARE
  RESPITE_CARE
}

enum AppointmentType {
  HOME_CARE_SHIFT
  MEDICAL_APPOINTMENT
  HOSPITAL_DISCHARGE
  INITIAL_ASSESSMENT
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum NoteCategory {
  DAILY_CARE_LOG
  MEDICATION_REMINDER
  VITALS_CHECK
  DISCHARGE_SUMMARY
  INCIDENT_REPORT
}

// ------------------------------------------------------
// AUTH MODELS (Better Auth Integration)
// ------------------------------------------------------

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          Role      @default(EMPLOYEE)
  phone         String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  accounts      Account[]
  
  assignedClients Client[]      @relation("AssignedCaregiver")
  appointments    Appointment[]
  clientNotes     ClientNote[]
  auditLogs       AuditLog[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// ------------------------------------------------------
// DOMAIN MODELS
// ------------------------------------------------------

model Client {
  id                  String   @id @default(cuid())
  firstName           String
  lastName            String
  dateOfBirth         DateTime?
  phone               String?
  address             String?
  emergencyContact    String?
  emergencyPhone      String?
  primaryCareType     CareType @default(PERSONAL_CARE)
  carePlanSummary     String?  @db.Text
  isActive            Boolean  @default(true)
  
  assignedEmployeeId  String
  assignedEmployee    User     @relation("AssignedCaregiver", fields: [assignedEmployeeId], references: [id])

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  appointments        Appointment[]
  notes               ClientNote[]

  @@index([assignedEmployeeId])
  @@index([lastName, firstName])
}

model Appointment {
  id              String            @id @default(cuid())
  clientId        String
  client          Client            @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  employeeId      String
  employee        User              @relation(fields: [employeeId], references: [id])

  type            AppointmentType   @default(HOME_CARE_SHIFT)
  status          AppointmentStatus @default(SCHEDULED)
  
  startTime       DateTime
  endTime         DateTime?
  location        String?
  summary         String?           @db.Text

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  notes           ClientNote[]

  @@index([employeeId])
  @@index([clientId])
  @@index([startTime])
}

model ClientNote {
  id                String       @id @default(cuid())
  clientId          String
  client            Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  employeeId        String
  employee          User         @relation(fields: [employeeId], references: [id])

  appointmentId     String?
  appointment       Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)

  category          NoteCategory @default(DAILY_CARE_LOG)
  adlTasksCompleted String[]
  content           String       @db.Text
  
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@index([employeeId])
  @@index([clientId])
  @@index([category])
  @@index([createdAt])
}

model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String
  entityType  String
  entityId    String
  ipAddress   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 5. UI/UX Design Specifications (Soft Pink Theme)

### Color Palette
* **Primary Branding Accent:** Deep Rose (`#DB2777` / Tailwind `pink-600`)
* **Secondary Soft Accent:** Light Pink / Blush (`#FCE7F3` / Tailwind `pink-100`)
* **Background Canvas:** Soft Warm Gray (`#FAFAFA` / Tailwind `zinc-50`)
* **Text & Typography:** Dark Charcoal (`#18181B` / Tailwind `zinc-900`) for clear readability on mobile screens.
* **Borders & Dividers:** Subtle Rose Gray (`#F472B6` at 20% opacity).

### Interface Elements & Formatting Rules
1. **No Sparkles / Artificial Decorations:** Icons strictly limited to functional Lucide React icons (`Calendar`, `User`, `ClipboardList`, `CheckSquare`, `FileText`, `LogOut`, `Printer`).
2. **Standard Buttons & Cards:** Clean, rectangular cards with subtle border rounding (`rounded-md` or `rounded-lg`). **No rounded pill bubbles.**
3. **Mobile Caregiver View:** Optimized for single-thumb tapping on smartphones. Fast checklist grid for ADL tasks (*Bathing, Grooming, Dressing, Meal Prep, Medication Reminder, Housekeeping*).

---

## 6. Functional Page Requirements

### A. Authentication Pages
* **`/login`:** Clean brand header (Glamour Homecare logo + soft pink accent bar). Form requires Email and Password. Zero public sign-up link.

### B. Admin Dashboard (`/admin`)
* **Staff Management Tab:** Create new caregivers, assign temporary temp passwords, toggle active status.
* **Client Directory Tab:** Add clients, set care type (*Personal Care*, *Companion Care*, *Respite Care*), and select assigned caregiver.
* **Global Activity Feed:** Filter all visit notes across the company by caregiver name, client name, or category (*e.g., filter specifically for "Discharge Summary"*).
* **Printable Summary Action:** "Print/Save as PDF" button that triggers native `window.print()` with `@media print` rules for clean paper exports.

### C. Caregiver Dashboard (`/app`)
* **My Schedule:** List of upcoming shifts and appointments.
* **My Clients:** Simple card list showing assigned patient names, emergency phone numbers, and care plan overviews.
* **Log Visit Form:**
  1. Select Client (Filtered strictly to assigned clients).
  2. Select Category (*Daily Care Log* or *Discharge Summary*).
  3. Tap ADL task checkboxes.
  4. Type narrative notes / discharge notes.
  5. Tap "Submit Visit Log".

---

## 7. Delivery & Phase Roadmap

* **Phase 1 (Current Contract - $800 Scope):**
  * Core Next.js standalone container deployed on AWS EC2 (`t3.micro`).
  * AWS RDS Postgres DB connection + Prisma migrations.
  * Better Auth setup with Admin & Employee RBAC.
  * Complete Employee & Admin UI dashboards in Soft Pink theme.
  * Browser-native PDF print export for discharge summaries.
* **Phase 2 (Future Upgrade Option):**
  * Direct AWS S3 presigned URL PDF/Image file upload integration for scanned discharge documents.

```
+-------------------------------------------------------------------+
|                        DEPLOYMENT TOPOLOGY                        |
+-------------------------------------------------------------------+
|                                                                   |
|   Caregiver Phone / Admin Laptop                                  |
|                 |                                                 |
|                 | HTTPS (443)                                     |
|                 v                                                 |
|   +-----------------------------------------------------------+   |
|   | AWS EC2 Instance (Ubuntu t3.micro - 1GB RAM)              |   |
|   |                                                           |   |
|   |   +---------------------------------------------------+   |   |
|   |   | Caddy Reverse Proxy (TLS Auto-Cert)               |   |   |
|   |   +-------------------------+-------------------------+   |   |
|   |                             |                             |   |
|   |                             v Port 3000                   |   |
|   |   +---------------------------------------------------+   |   |
|   |   | Next.js Standalone Docker Container               |   |   |
|   |   | (Better Auth + Server Actions)                    |   |   |
|   |   +-------------------------+-------------------------+   |   |
|   +-----------------------------|-----------------------------+   |
|                                 |                                 |
|                                 v Private VPC Subnet              |
|   +-----------------------------------------------------------+   |
|   | AWS RDS PostgreSQL (db.t4g.micro - Encrypted)             |   |
|   +-----------------------------------------------------------+   |
+-------------------------------------------------------------------+
```