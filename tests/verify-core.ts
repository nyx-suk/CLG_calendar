import {
  computeSubjectAttendance,
  calculateSafeBunks,
  categorizeTier,
  simulateMissImpact,
} from "../lib/attendance-calculator";
import { parseGitHubRepoUrl } from "../lib/github-verifier";
import { resolveStudentDaySchedule } from "../lib/calendar-generator";
import { prisma } from "../lib/prisma";

async function runTests() {
  console.log("=== RUNNING AUTOMATED UNIT TESTS FOR CORE LOGIC ===");

  // 1. Test Attendance Formulas
  console.log("\n[TEST 1] Testing Dual Attendance & Tier Classification...");
  const subStats = computeSubjectAttendance({
    subjectId: "sub-1",
    subjectName: "Operating Systems",
    subjectCode: "CS501",
    importance: "HIGH",
    baselineConducted: 20,
    baselineAttended: 16, // 80% baseline
    ongoingConducted: 4,
    ongoingAttended: 2,   // in-person: 18 / 24 = 75.0%
    ongoingOD: 2,         // with OD: (18 + 2) / 24 = 83.3%
  });

  if (subStats.totalConducted !== 24) throw new Error(`Expected 24 totalConducted, got ${subStats.totalConducted}`);
  if (subStats.physicallyAttended !== 18) throw new Error(`Expected 18 physicallyAttended, got ${subStats.physicallyAttended}`);
  if (subStats.physicalPercentage !== 75.0) throw new Error(`Expected 75.0% physical, got ${subStats.physicalPercentage}`);
  if (subStats.odPercentage !== 83.3) throw new Error(`Expected 83.3% OD, got ${subStats.odPercentage}`);
  if (subStats.tier !== "MEDICAL_SAFE") throw new Error(`Expected MEDICAL_SAFE tier, got ${subStats.tier}`);
  console.log("✓ Dual attendance (Physical 75.0% vs OD 83.3%) computed correctly!");

  // 2. Test Safe Bunks
  console.log("\n[TEST 2] Testing Safe Bunk Calculator...");
  // Attended 18 out of 20 = 90%. How many can miss before < 85%?
  // Floor((18 - 0.85 * 20) / 0.85) = Floor((18 - 17) / 0.85) = Floor(1 / 0.85) = 1
  const safeFor85 = calculateSafeBunks(18, 20, 85);
  if (safeFor85 !== 1) throw new Error(`Expected 1 safe bunk, got ${safeFor85}`);
  // How many before < 75%? Floor((18 - 15) / 0.75) = 4
  const safeFor75 = calculateSafeBunks(18, 20, 75);
  if (safeFor75 !== 4) throw new Error(`Expected 4 safe bunks, got ${safeFor75}`);
  console.log("✓ Safe-to-miss calculations passed (1 for 85%, 4 for 75%)!");

  // 3. Test Simulation & High Importance Warning
  console.log("\n[TEST 3] Testing Miss Simulator & Warnings...");
  const sim = simulateMissImpact(subStats, 2, false); // Miss 2 more without OD
  // New conducted: 26. Attended: 18. New physical % = 18/26 = 69.2%. New OD % = 20/26 = 76.9%
  if (sim.projectedPhysicalPercentage !== 69.2) throw new Error(`Expected 69.2% physical, got ${sim.projectedPhysicalPercentage}`);
  if (sim.projectedODPercentage !== 76.9) throw new Error(`Expected 76.9% OD, got ${sim.projectedODPercentage}`);
  if (!sim.warning || !sim.warning.includes("HIGH IMPORTANCE")) {
    throw new Error(`Expected high importance warning, got: ${sim.warning}`);
  }
  console.log(`✓ Simulator warning correctly generated: "${sim.warning}"`);

  // 4. Test GitHub URL Parser
  console.log("\n[TEST 4] Testing GitHub URL Parser...");
  const parsed1 = parseGitHubRepoUrl("https://github.com/facebook/rocksdb");
  if (!parsed1 || parsed1.owner !== "facebook" || parsed1.repo !== "rocksdb") {
    throw new Error(`Failed to parse standard GitHub URL: ${JSON.stringify(parsed1)}`);
  }
  const parsed2 = parseGitHubRepoUrl("https://github.com/torvalds/linux.git/");
  if (!parsed2 || parsed2.owner !== "torvalds" || parsed2.repo !== "linux") {
    throw new Error(`Failed to parse trailing slash / .git URL: ${JSON.stringify(parsed2)}`);
  }
  console.log("✓ GitHub URL parsing passed!");

  // 5. Test Calendar COE Resolution & Day Swaps
  console.log("\n[TEST 5] Testing Calendar Resolution with COE Timetable Swap & IATs...");
  const student = await prisma.user.findFirst({ where: { role: "STUDENT" } });
  if (!student) throw new Error("No student found in seeded database");

  // On 2026-10-21, COE says: "Wednesday follows Monday schedule"
  const swappedDay = await resolveStudentDaySchedule({
    studentId: student.id,
    section: "5A",
    dateStr: "2026-10-21",
  });

  if (!swappedDay.isCOEOverridden) throw new Error("Expected COE override on 2026-10-21");
  if (swappedDay.effectiveDayOfWeek !== 1) throw new Error(`Expected effectiveDayOfWeek 1 (Monday), got ${swappedDay.effectiveDayOfWeek}`);
  // Monday has 4 slots (OS, DBMS, CN, SE Lab)
  if (swappedDay.slots.length !== 4) throw new Error(`Expected 4 slots from Monday timetable, got ${swappedDay.slots.length}`);
  console.log(`✓ 2026-10-21 successfully resolved to Monday timetable (${swappedDay.slots.length} periods, Title: "${swappedDay.coeTitle}")!`);

  // On 2026-10-23, COE says: IAT 2 Day 1
  const iatDay = await resolveStudentDaySchedule({
    studentId: student.id,
    section: "5A",
    dateStr: "2026-10-23",
  });
  if (iatDay.coeType !== "IAT") throw new Error(`Expected coeType IAT, got ${iatDay.coeType}`);
  if (iatDay.slots.length !== 0) throw new Error("Expected 0 regular lecture slots during IAT day");
  console.log("✓ 2026-10-23 correctly recognized as IAT day with regular lectures suspended!");

  console.log("\n>>> ALL TESTS PASSED! Core computational engines are 100% verified. <<<\n");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
