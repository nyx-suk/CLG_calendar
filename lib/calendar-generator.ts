import { prisma } from "@/lib/prisma";

export interface ResolvedCalendarSlot {
  slotId: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  room?: string | null;
  lecturerName?: string | null;
  status: "SCHEDULED" | "ATTENDED" | "ABSENT" | "ON_DUTY";
  eventApplicationTitle?: string | null;
  eventCategory?: string | null;
}

export interface ResolvedDaySchedule {
  date: string; // "YYYY-MM-DD"
  dayName: string; // "Monday", "Tuesday", etc.
  dayOfWeek: number; // 1 to 7
  isCOEOverridden: boolean;
  coeType?: "HOLIDAY" | "IAT" | "TIMETABLE_SWAP" | "SPECIAL_EVENT" | null;
  coeHighlight?: string | null; // "YELLOW" | "GREY" | null
  coeTitle?: string | null;
  coeNotes?: string | null;
  effectiveDayOfWeek: number;
  slots: ResolvedCalendarSlot[];
  activeEvents: {
    id: string;
    title: string;
    category: string;
    status: string;
  }[];
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function resolveStudentDaySchedule(params: {
  studentId: string;
  section: string;
  dateStr: string; // "YYYY-MM-DD"
}): Promise<ResolvedDaySchedule> {
  const { studentId, section, dateStr } = params;

  // 1. Calculate JS day of week (0=Sun, 1=Mon, ..., 6=Sat)
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const jsDay = targetDate.getUTCDay();
  // Map to 1 = Mon ... 7 = Sun
  const baseDayOfWeek = jsDay === 0 ? 7 : jsDay;
  const dayName = DAY_NAMES[jsDay];

  // 2. Check for COE event on this date
  const coeEvent = await prisma.cOEEvent.findFirst({
    where: { date: dateStr },
  });

  let effectiveDayOfWeek = baseDayOfWeek;
  let isHoliday = false;
  let isIAT = false;

  if (coeEvent) {
    if (coeEvent.type === "TIMETABLE_SWAP" && coeEvent.swapDayOfWeek) {
      effectiveDayOfWeek = coeEvent.swapDayOfWeek;
    } else if (coeEvent.type === "HOLIDAY") {
      isHoliday = true;
    } else if (coeEvent.type === "IAT") {
      isIAT = true;
    }
  }

  // 3. Find any active student event applications covering this date
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  const activeApplications = await prisma.eventApplication.findMany({
    where: {
      studentId,
      startDate: { lte: endOfDay },
      endDate: { gte: startOfDay },
    },
  });

  const activeEvents = activeApplications.map((app) => ({
    id: app.id,
    title: app.title,
    category: app.category,
    status: app.status,
  }));

  // If holiday or Sunday (without timetable), return empty slots
  if (isHoliday || effectiveDayOfWeek === 7) {
    return {
      date: dateStr,
      dayName,
      dayOfWeek: baseDayOfWeek,
      isCOEOverridden: !!coeEvent,
      coeType: coeEvent?.type as any,
      coeHighlight: coeEvent?.highlightColor,
      coeTitle: coeEvent?.title,
      coeNotes: coeEvent?.notes,
      effectiveDayOfWeek,
      slots: [],
      activeEvents,
    };
  }

  // If IAT (Internal Assessment Test), treat as exam holiday/special schedule
  if (isIAT) {
    return {
      date: dateStr,
      dayName,
      dayOfWeek: baseDayOfWeek,
      isCOEOverridden: true,
      coeType: "IAT",
      coeHighlight: coeEvent?.highlightColor ?? "GREY",
      coeTitle: coeEvent?.title ?? "Internal Assessment Test (IAT)",
      coeNotes: coeEvent?.notes ?? "Special exam schedule — standard class attendance exempt.",
      effectiveDayOfWeek,
      slots: [],
      activeEvents,
    };
  }

  // 4. Fetch regular timetable slots for the effectiveDayOfWeek
  const rawSlots = await prisma.timetableSlot.findMany({
    where: {
      section,
      dayOfWeek: effectiveDayOfWeek,
    },
    include: {
      subject: {
        include: {
          lecturer: true,
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  // 5. Fetch any existing class attendance records for this student on this date
  const attendanceRecords = await prisma.classAttendanceRecord.findMany({
    where: {
      studentId,
      date: dateStr,
    },
    include: {
      application: true,
    },
  });

  const recordMap = new Map<string, (typeof attendanceRecords)[0]>();
  attendanceRecords.forEach((rec) => {
    recordMap.set(`${rec.subjectId}_${rec.slotStartTime}`, rec);
  });

  // 6. Map to ResolvedCalendarSlot
  const approvedActiveEvent = activeApplications.find((app) => app.status === "APPROVED");

  const slots: ResolvedCalendarSlot[] = rawSlots.map((slot) => {
    const existingRec = recordMap.get(`${slot.subjectId}_${slot.startTime}`);
    let status: ResolvedCalendarSlot["status"] = "SCHEDULED";
    let eventTitle: string | null = null;
    let eventCategory: string | null = null;

    if (existingRec) {
      status = existingRec.status as ResolvedCalendarSlot["status"];
      if (existingRec.application) {
        eventTitle = existingRec.application.title;
        eventCategory = existingRec.application.category;
      }
    } else if (approvedActiveEvent) {
      status = "ON_DUTY";
      eventTitle = approvedActiveEvent.title;
      eventCategory = approvedActiveEvent.category;
    }

    return {
      slotId: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: slot.subjectId,
      subjectName: slot.subject.name,
      subjectCode: slot.subject.code,
      importance: slot.subject.importance as any,
      room: slot.room,
      lecturerName: slot.subject.lecturer?.name,
      status,
      eventApplicationTitle: eventTitle,
      eventCategory,
    };
  });

  return {
    date: dateStr,
    dayName,
    dayOfWeek: baseDayOfWeek,
    isCOEOverridden: !!coeEvent,
    coeType: coeEvent?.type as any,
    coeHighlight: coeEvent?.highlightColor,
    coeTitle: coeEvent?.title,
    coeNotes: coeEvent?.notes,
    effectiveDayOfWeek,
    slots,
    activeEvents,
  };
}
