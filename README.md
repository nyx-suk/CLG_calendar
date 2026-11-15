# CampusFlow

CampusFlow is an intelligent attendance, academic calendar, and extracurricular management system tailored for collegiate institutions. Built on Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, and Prisma ORM with SQLite.

## Core Architectural Guarantees

1. **Attendance Calculation**: Attendance metrics, tiers, and safe bunk calculations are exclusively computed via `computeSubjectAttendance()` in `lib/attendance-calculator.ts`.
2. **Dynamic Calendar Resolution**: Daily timetables, COE overrides, and exam adjustments are resolved via `resolveStudentDaySchedule()` in `lib/calendar-generator.ts`.
3. **Application Approvals**: On-duty event approval and attendance adjustments are audited exclusively through `reviewApplication()` in `app/actions.ts`.
4. **Prisma Upsert Invariants**:
   - `AttendanceBaseline` upserts strictly on `studentId_subjectId`.
   - `ClassAttendanceRecord` upserts strictly on `studentId_subjectId_date_slotStartTime`.

---

## Setup & Getting Started

### 1. Prerequisites
- Node.js 20+
- npm 10+

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key variables:
- `DATABASE_URL`: Path to SQLite database (default: `"file:./dev.db"`).
- `GITHUB_TOKEN`: Optional GitHub Personal Access Token to avoid rate limits during repo proof verification.
- `AUTH_SECRET`: Secret key used for session encryption.
- `ALLOWED_EMAIL_DOMAIN`: Institutional domain restriction for logins (e.g. `college.edu`).

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Seeding
Generate Prisma Client, push schema to SQLite, and seed demo records:
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 5. Verification
Run the verification suite (TypeScript compiler check, ESLint check, and core computational unit tests):
```bash
npm run verify
```

### 6. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
