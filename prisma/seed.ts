import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning existing database...");
  await prisma.classAttendanceRecord.deleteMany();
  await prisma.eventApplication.deleteMany();
  await prisma.extracurricularEvent.deleteMany();
  await prisma.cOEEvent.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.attendanceBaseline.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding Users...");
  // 1. Staff
  const mentor = await prisma.user.create({
    data: {
      name: "Dr. Rajesh Rao",
      email: "mentor.rao@college.edu",
      role: "MENTOR",
      department: "Computer Science & Engineering",
    },
  });

  const coordinator = await prisma.user.create({
    data: {
      name: "Prof. Sunita Patil",
      email: "coordinator.patil@college.edu",
      role: "COORDINATOR",
      department: "Computer Science & Engineering",
    },
  });

  const lecturerOS = await prisma.user.create({
    data: {
      name: "Prof. Vikram Singh",
      email: "vikram.singh@college.edu",
      role: "LECTURER",
      department: "Computer Science & Engineering",
    },
  });

  const lecturerDBMS = await prisma.user.create({
    data: {
      name: "Dr. Ananya Desai",
      email: "ananya.desai@college.edu",
      role: "LECTURER",
      department: "Computer Science & Engineering",
    },
  });

  const lecturerCN = await prisma.user.create({
    data: {
      name: "Prof. Ramesh Kulkarni",
      email: "ramesh.k@college.edu",
      role: "LECTURER",
      department: "Computer Science & Engineering",
    },
  });

  const lecturerTOC = await prisma.user.create({
    data: {
      name: "Dr. Priya Nair",
      email: "priya.nair@college.edu",
      role: "LECTURER",
      department: "Computer Science & Engineering",
    },
  });

  // 2. Students
  const studentAarav = await prisma.user.create({
    data: {
      name: "Aarav Sharma",
      email: "aarav@college.edu",
      role: "STUDENT",
      department: "Computer Science & Engineering",
      semester: 5,
      section: "5A",
      rollNumber: "1MS22CS042",
      githubUsername: "aarav-code",
      mentorId: mentor.id,
    },
  });

  const studentSneha = await prisma.user.create({
    data: {
      name: "Sneha Reddy",
      email: "sneha@college.edu",
      role: "STUDENT",
      department: "Computer Science & Engineering",
      semester: 5,
      section: "5A",
      rollNumber: "1MS22CS089",
      githubUsername: "sneha-dev",
      mentorId: mentor.id,
    },
  });

  console.log("Seeding Subjects...");
  const subOS = await prisma.subject.create({
    data: {
      name: "Operating Systems",
      code: "CS501",
      importance: "HIGH",
      lecturerId: lecturerOS.id,
    },
  });

  const subDBMS = await prisma.subject.create({
    data: {
      name: "Database Management Systems",
      code: "CS502",
      importance: "MEDIUM",
      lecturerId: lecturerDBMS.id,
    },
  });

  const subCN = await prisma.subject.create({
    data: {
      name: "Computer Networks",
      code: "CS503",
      importance: "HIGH",
      lecturerId: lecturerCN.id,
    },
  });

  const subTOC = await prisma.subject.create({
    data: {
      name: "Theory of Computation",
      code: "CS504",
      importance: "MEDIUM",
      lecturerId: lecturerTOC.id,
    },
  });

  const subSELab = await prisma.subject.create({
    data: {
      name: "Software Engineering & Project Lab",
      code: "CS505L",
      importance: "LOW",
      lecturerId: lecturerOS.id,
    },
  });

  console.log("Seeding Attendance Baselines (Mid-Semester Onboarding)...");
  // Aarav's baseline
  await prisma.attendanceBaseline.createMany({
    data: [
      { studentId: studentAarav.id, subjectId: subOS.id, baselineConducted: 28, baselineAttended: 24 }, // 85.7%
      { studentId: studentAarav.id, subjectId: subDBMS.id, baselineConducted: 26, baselineAttended: 20 }, // 76.9%
      { studentId: studentAarav.id, subjectId: subCN.id, baselineConducted: 24, baselineAttended: 18 }, // 75.0%
      { studentId: studentAarav.id, subjectId: subTOC.id, baselineConducted: 25, baselineAttended: 21 }, // 84.0%
      { studentId: studentAarav.id, subjectId: subSELab.id, baselineConducted: 10, baselineAttended: 9 }, // 90.0%
    ],
  });

  // Sneha's baseline
  await prisma.attendanceBaseline.createMany({
    data: [
      { studentId: studentSneha.id, subjectId: subOS.id, baselineConducted: 28, baselineAttended: 15 }, // 53.5% (Internship student)
      { studentId: studentSneha.id, subjectId: subDBMS.id, baselineConducted: 26, baselineAttended: 14 },
      { studentId: studentSneha.id, subjectId: subCN.id, baselineConducted: 24, baselineAttended: 13 },
      { studentId: studentSneha.id, subjectId: subTOC.id, baselineConducted: 25, baselineAttended: 14 },
      { studentId: studentSneha.id, subjectId: subSELab.id, baselineConducted: 10, baselineAttended: 6 },
    ],
  });

  console.log("Seeding Timetable for Section 5A...");
  const timetableEntries = [
    // Monday (dayOfWeek = 1)
    { section: "5A", dayOfWeek: 1, startTime: "09:00", endTime: "10:00", subjectId: subOS.id, room: "Room 301" },
    { section: "5A", dayOfWeek: 1, startTime: "10:00", endTime: "11:00", subjectId: subDBMS.id, room: "Room 301" },
    { section: "5A", dayOfWeek: 1, startTime: "11:15", endTime: "12:15", subjectId: subCN.id, room: "Room 301" },
    { section: "5A", dayOfWeek: 1, startTime: "13:00", endTime: "15:00", subjectId: subSELab.id, room: "Lab 2" },

    // Tuesday (dayOfWeek = 2)
    { section: "5A", dayOfWeek: 2, startTime: "09:00", endTime: "10:00", subjectId: subTOC.id, room: "Room 302" },
    { section: "5A", dayOfWeek: 2, startTime: "10:00", endTime: "11:00", subjectId: subOS.id, room: "Room 302" },
    { section: "5A", dayOfWeek: 2, startTime: "11:15", endTime: "12:15", subjectId: subDBMS.id, room: "Room 302" },

    // Wednesday (dayOfWeek = 3)
    { section: "5A", dayOfWeek: 3, startTime: "09:00", endTime: "10:00", subjectId: subCN.id, room: "Room 301" },
    { section: "5A", dayOfWeek: 3, startTime: "10:00", endTime: "11:00", subjectId: subTOC.id, room: "Room 301" },
    { section: "5A", dayOfWeek: 3, startTime: "11:15", endTime: "12:15", subjectId: subOS.id, room: "Room 301" },

    // Thursday (dayOfWeek = 4)
    { section: "5A", dayOfWeek: 4, startTime: "09:00", endTime: "10:00", subjectId: subDBMS.id, room: "Room 303" },
    { section: "5A", dayOfWeek: 4, startTime: "10:00", endTime: "11:00", subjectId: subCN.id, room: "Room 303" },
    { section: "5A", dayOfWeek: 4, startTime: "11:15", endTime: "12:15", subjectId: subTOC.id, room: "Room 303" },

    // Friday (dayOfWeek = 5)
    { section: "5A", dayOfWeek: 5, startTime: "09:00", endTime: "10:00", subjectId: subOS.id, room: "Room 301" },
    { section: "5A", dayOfWeek: 5, startTime: "10:00", endTime: "11:00", subjectId: subCN.id, room: "Room 301" },
    { section: "5A", dayOfWeek: 5, startTime: "11:15", endTime: "12:15", subjectId: subDBMS.id, room: "Room 301" },
  ];

  await prisma.timetableSlot.createMany({
    data: timetableEntries,
  });

  console.log("Seeding Calendar of Events (COE)...");
  await prisma.cOEEvent.createMany({
    data: [
      {
        date: "2026-10-21",
        type: "TIMETABLE_SWAP",
        highlightColor: "YELLOW",
        swapDayOfWeek: 1, // Follow Monday schedule
        title: "Timetable Adjustment: Wednesday follows Monday Schedule",
        notes: "Due to previous public holiday, Monday periods will be conducted today.",
      },
      {
        date: "2026-10-23",
        type: "IAT",
        highlightColor: "GREY",
        title: "Internal Assessment Test - IAT 2 Day 1",
        notes: "Special examination timetable applies. No standard lecture attendance taken.",
      },
      {
        date: "2026-10-24",
        type: "IAT",
        highlightColor: "GREY",
        title: "Internal Assessment Test - IAT 2 Day 2",
        notes: "Special examination timetable applies.",
      },
      {
        date: "2026-10-31",
        type: "HOLIDAY",
        highlightColor: "YELLOW",
        title: "Diwali Eve / Festival Holiday",
        notes: "College closed.",
      },
    ],
  });

  console.log("Seeding Extracurricular Catalog...");
  await prisma.extracurricularEvent.createMany({
    data: [
      {
        title: "Smart India Hackathon 2026 - Grand Finale",
        category: "HACKATHON",
        startDate: new Date("2026-10-15T09:00:00Z"),
        endDate: new Date("2026-10-17T18:00:00Z"),
        location: "IIT Delhi / Hybrid",
        description: "National level software hackathon solving ministry problem statements.",
        isPublicListing: true,
        link: "https://sih.gov.in",
      },
      {
        title: "VTU Inter-College Basketball Tournament",
        category: "SPORTS",
        startDate: new Date("2026-10-27T08:00:00Z"),
        endDate: new Date("2026-10-28T18:00:00Z"),
        location: "Campus Sports Complex",
        description: "Zonal championship matches for university teams.",
        isPublicListing: true,
      },
      {
        title: "Open Source Kernel & Systems Sprint",
        category: "PROJECT",
        startDate: new Date("2026-10-10T10:00:00Z"),
        endDate: new Date("2026-10-14T20:00:00Z"),
        location: "Online / GitHub",
        description: "Core contributions to distributed storage system repositories.",
        isPublicListing: true,
        link: "https://github.com",
      },
      {
        title: "IEEE Webinar: Scalable Microservices Architecture",
        category: "WEBINAR",
        startDate: new Date("2026-10-29T14:00:00Z"),
        endDate: new Date("2026-10-29T17:00:00Z"),
        location: "Virtual / Zoom",
        description: "Technical workshop led by Google Cloud engineering team.",
        isPublicListing: true,
      },
    ],
  });

  console.log("Seeding Event Applications & Proofs...");
  // 1. Aarav's approved Hackathon
  const appHackathon = await prisma.eventApplication.create({
    data: {
      studentId: studentAarav.id,
      title: "Smart India Hackathon 2026 - Grand Finale",
      category: "HACKATHON",
      startDate: new Date("2026-10-15T09:00:00Z"),
      endDate: new Date("2026-10-17T18:00:00Z"),
      description: "Represented college team in AI problem statement finals.",
      status: "APPROVED",
      proofType: "CERTIFICATE",
      proofUrl: "https://example.com/sih_certificate_aarav.pdf",
      proofVerified: true,
      mentorRemarks: "Verified official participation certificate and team list.",
    },
  });

  // 2. Aarav's pending Project Sprint with GitHub commit verification
  await prisma.eventApplication.create({
    data: {
      studentId: studentAarav.id,
      title: "Distributed Key-Value Engine Development Sprint",
      category: "PROJECT",
      startDate: new Date("2026-10-10T09:00:00Z"),
      endDate: new Date("2026-10-14T20:00:00Z"),
      description: "Building Raft consensus and LSM-tree storage engine.",
      status: "PENDING_APPROVAL",
      proofType: "GITHUB_REPO",
      githubRepoUrl: "https://github.com/facebook/rocksdb",
      githubUsername: "aarav-code",
      githubCommitCount: 9,
      githubSummary: "9 commits verified during sprint: Raft leader election handler, write-ahead log flush, and unit tests.",
      proofVerified: false,
    },
  });

  // 3. Aarav's approved Medical application
  const appMedical = await prisma.eventApplication.create({
    data: {
      studentId: studentAarav.id,
      title: "Medical Leave - Viral Fever",
      category: "MEDICAL",
      startDate: new Date("2026-10-06T09:00:00Z"),
      endDate: new Date("2026-10-07T18:00:00Z"),
      description: "Severe fever and clinical rest advised by doctor.",
      status: "APPROVED",
      proofType: "MEDICAL_SLIP",
      proofUrl: "https://example.com/medical_slip_aarav.pdf",
      proofVerified: true,
      mentorRemarks: "Doctor's certificate verified and stamped by clinic.",
    },
  });

  // 4. Sneha's long internship (40% flexible tier)
  await prisma.eventApplication.create({
    data: {
      studentId: studentSneha.id,
      title: "Backend Engineering Internship @ CloudTech",
      category: "INTERNSHIP",
      startDate: new Date("2026-10-01T09:00:00Z"),
      endDate: new Date("2026-11-30T18:00:00Z"),
      description: "Full-time sanctioned industry internship under university MoU.",
      status: "APPROVED",
      proofType: "CERTIFICATE",
      proofUrl: "https://example.com/cloudtech_internship_letter.pdf",
      proofVerified: true,
      mentorRemarks: "Approved under University Fast-track Industry Internship Policy (>40% tier).",
    },
  });

  console.log("Seeding Ongoing Class Attendance Records (with On-Duty credits)...");
  // Oct 15 & 16: Aarav was at Hackathon (On-Duty approved)
  await prisma.classAttendanceRecord.createMany({
    data: [
      // 2026-10-15 (Thursday)
      { studentId: studentAarav.id, subjectId: subDBMS.id, date: "2026-10-15", slotStartTime: "09:00", status: "ON_DUTY", applicationId: appHackathon.id },
      { studentId: studentAarav.id, subjectId: subCN.id, date: "2026-10-15", slotStartTime: "10:00", status: "ON_DUTY", applicationId: appHackathon.id },
      { studentId: studentAarav.id, subjectId: subTOC.id, date: "2026-10-15", slotStartTime: "11:15", status: "ON_DUTY", applicationId: appHackathon.id },

      // 2026-10-16 (Friday)
      { studentId: studentAarav.id, subjectId: subOS.id, date: "2026-10-16", slotStartTime: "09:00", status: "ON_DUTY", applicationId: appHackathon.id },
      { studentId: studentAarav.id, subjectId: subCN.id, date: "2026-10-16", slotStartTime: "10:00", status: "ON_DUTY", applicationId: appHackathon.id },
      { studentId: studentAarav.id, subjectId: subDBMS.id, date: "2026-10-16", slotStartTime: "11:15", status: "ON_DUTY", applicationId: appHackathon.id },

      // 2026-10-19 (Today - Monday)
      { studentId: studentAarav.id, subjectId: subOS.id, date: "2026-10-19", slotStartTime: "09:00", status: "ATTENDED" },
      { studentId: studentAarav.id, subjectId: subDBMS.id, date: "2026-10-19", slotStartTime: "10:00", status: "ATTENDED" },
      { studentId: studentAarav.id, subjectId: subCN.id, date: "2026-10-19", slotStartTime: "11:15", status: "ABSENT" }, // Unexcused absence
    ],
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
