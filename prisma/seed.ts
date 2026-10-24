import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Glamour Homecare Portal database with comprehensive 10-client week-long dataset...");

  // Clean existing domain tables
  await prisma.auditLog.deleteMany({});
  await prisma.clientNote.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Shavonnah (RN Owner/Admin)
  const admin = await prisma.user.create({
    data: {
      id: "usr_shavonnah_admin",
      name: "Shavonnah (RN Owner)",
      email: "shavonnah@glamourhomecare.org",
      emailVerified: true,
      role: "ADMIN",
      phone: "(540) 555-0199",
      isActive: true,
      accounts: {
        create: {
          accountId: "usr_shavonnah_admin",
          providerId: "credential",
          password: defaultPasswordHash,
        },
      },
    },
  });

  // 2. Create Caregivers
  const martha = await prisma.user.create({
    data: {
      id: "usr_martha_employee",
      name: "Martha Jenkins",
      email: "martha@glamourhomecare.org",
      emailVerified: true,
      role: "EMPLOYEE",
      phone: "(540) 555-0144",
      isActive: true,
      accounts: {
        create: {
          accountId: "usr_martha_employee",
          providerId: "credential",
          password: defaultPasswordHash,
        },
      },
    },
  });

  const gloria = await prisma.user.create({
    data: {
      id: "usr_gloria_employee",
      name: "Gloria Ramirez",
      email: "gloria@glamourhomecare.org",
      emailVerified: true,
      role: "EMPLOYEE",
      phone: "(540) 555-0182",
      isActive: true,
      accounts: {
        create: {
          accountId: "usr_gloria_employee",
          providerId: "credential",
          password: defaultPasswordHash,
        },
      },
    },
  });

  const sarahCare = await prisma.user.create({
    data: {
      id: "usr_sarah_employee",
      name: "Sarah Chen",
      email: "sarah@glamourhomecare.org",
      emailVerified: true,
      role: "EMPLOYEE",
      phone: "(540) 555-0163",
      isActive: true,
      accounts: {
        create: {
          accountId: "usr_sarah_employee",
          providerId: "credential",
          password: defaultPasswordHash,
        },
      },
    },
  });

  console.log("Created users:", admin.email, martha.email, gloria.email, sarahCare.email);

  // 3. Define 10 Clients (including Eleanor, Robert, Evelyn, Harold)
  const clientDefinitions = [
    // Assigned to Martha (4 clients)
    {
      id: "cli_eleanor_vance",
      firstName: "Eleanor",
      lastName: "Vance",
      dateOfBirth: new Date("1944-03-12"),
      phone: "(540) 555-2144",
      address: "104 Washington Ave, Fredericksburg, VA 22401",
      emergencyContact: "Sarah Vance (Daughter)",
      emergencyPhone: "(540) 555-8821",
      primaryCareType: "PERSONAL_CARE" as const,
      carePlanSummary: "Assistance with morning bathing, dressing, meal preparation, and medication reminders. Walker mobility support. Low sodium diet.",
      assignedEmployeeId: martha.id,
      caregiver: martha,
      baselineVitals: { temp: 98.2, bpSys: 122, bpDia: 78, hr: 72, spo2: 97, rr: 16 },
    },
    {
      id: "cli_robert_sterling",
      firstName: "Robert",
      lastName: "Sterling",
      dateOfBirth: new Date("1938-11-04"),
      phone: "(540) 555-7319",
      address: "218 Caroline St, Fredericksburg, VA 22401",
      emergencyContact: "Michael Sterling (Son)",
      emergencyPhone: "(540) 555-9034",
      primaryCareType: "COMPANION_CARE" as const,
      carePlanSummary: "Companion care, cognitive stimulation, light housekeeping, hydration encouragement, and afternoon garden walks.",
      assignedEmployeeId: martha.id,
      caregiver: martha,
      baselineVitals: { temp: 97.9, bpSys: 134, bpDia: 84, hr: 68, spo2: 96, rr: 18 },
    },
    {
      id: "cli_clara_barton",
      firstName: "Clara",
      lastName: "Barton",
      dateOfBirth: new Date("1947-06-15"),
      phone: "(540) 555-4129",
      address: "305 Hanover St, Fredericksburg, VA 22401",
      emergencyContact: "Patricia Barton (Sister)",
      emergencyPhone: "(540) 555-9831",
      primaryCareType: "PERSONAL_CARE" as const,
      carePlanSummary: "Diabetic foot inspection, blood sugar support, morning hygiene assistance, and gentle walking exercise.",
      assignedEmployeeId: martha.id,
      caregiver: martha,
      baselineVitals: { temp: 98.4, bpSys: 128, bpDia: 82, hr: 76, spo2: 98, rr: 16 },
    },
    {
      id: "cli_arthur_pendleton",
      firstName: "Arthur",
      lastName: "Pendleton",
      dateOfBirth: new Date("1935-09-28"),
      phone: "(540) 555-8271",
      address: "614 George St, Fredericksburg, VA 22401",
      emergencyContact: "Thomas Pendleton (Son)",
      emergencyPhone: "(540) 555-3920",
      primaryCareType: "RESPITE_CARE" as const,
      carePlanSummary: "Parkinson's tremors care, safe pivot transfers, mealtime swallow monitoring, and family respite relief.",
      assignedEmployeeId: martha.id,
      caregiver: martha,
      baselineVitals: { temp: 98.1, bpSys: 118, bpDia: 74, hr: 66, spo2: 95, rr: 17 },
    },

    // Assigned to Gloria (3 clients)
    {
      id: "cli_evelyn_moore",
      firstName: "Evelyn",
      lastName: "Moore",
      dateOfBirth: new Date("1950-07-22"),
      phone: "(540) 555-4421",
      address: "512 Fall Hill Ave, Fredericksburg, VA 22401",
      emergencyContact: "David Moore (Spouse)",
      emergencyPhone: "(540) 555-3312",
      primaryCareType: "RESPITE_CARE" as const,
      carePlanSummary: "Respite relief for family spouse caregiver. Blood pressure tracking, grooming assistance, seated chair exercises, and safe transfers.",
      assignedEmployeeId: gloria.id,
      caregiver: gloria,
      baselineVitals: { temp: 98.6, bpSys: 138, bpDia: 88, hr: 78, spo2: 97, rr: 18 },
    },
    {
      id: "cli_harold_washington",
      firstName: "Harold",
      lastName: "Washington",
      dateOfBirth: new Date("1942-01-19"),
      phone: "(540) 555-6820",
      address: "809 Princess Anne St, Fredericksburg, VA 22401",
      emergencyContact: "Angela Washington (Daughter)",
      emergencyPhone: "(540) 555-7762",
      primaryCareType: "PERSONAL_CARE" as const,
      carePlanSummary: "Post-rehab strengthening and mobility support. Stand-by shower assist, nutrition logging, and fall prevention monitoring.",
      assignedEmployeeId: gloria.id,
      caregiver: gloria,
      baselineVitals: { temp: 99.2, bpSys: 144, bpDia: 92, hr: 84, spo2: 94, rr: 20 }, // Mild elevation for realism
    },
    {
      id: "cli_margaret_hayes",
      firstName: "Margaret",
      lastName: "Hayes",
      dateOfBirth: new Date("1946-12-03"),
      phone: "(540) 555-9182",
      address: "1208 Kenmore Ave, Fredericksburg, VA 22401",
      emergencyContact: "Emily Hayes (Niece)",
      emergencyPhone: "(540) 555-6341",
      primaryCareType: "COMPANION_CARE" as const,
      carePlanSummary: "Social enrichment, memory card games, afternoon tea, medication adherence tracking, and light walking in garden.",
      assignedEmployeeId: gloria.id,
      caregiver: gloria,
      baselineVitals: { temp: 98.0, bpSys: 120, bpDia: 76, hr: 70, spo2: 98, rr: 15 },
    },

    // Assigned to Sarah Chen (3 clients)
    {
      id: "cli_james_caldwell",
      firstName: "James",
      lastName: "Caldwell",
      dateOfBirth: new Date("1940-04-18"),
      phone: "(540) 555-3211",
      address: "419 Sophia St, Fredericksburg, VA 22401",
      emergencyContact: "Richard Caldwell (Son)",
      emergencyPhone: "(540) 555-7890",
      primaryCareType: "PERSONAL_CARE" as const,
      carePlanSummary: "Assistance with personal grooming, compression stocking application, low-sodium meal preparation, and fluid intake monitoring.",
      assignedEmployeeId: sarahCare.id,
      caregiver: sarahCare,
      baselineVitals: { temp: 98.3, bpSys: 130, bpDia: 80, hr: 74, spo2: 96, rr: 16 },
    },
    {
      id: "cli_dorothy_foster",
      firstName: "Dorothy",
      lastName: "Foster",
      dateOfBirth: new Date("1949-08-30"),
      phone: "(540) 555-6674",
      address: "721 William St, Fredericksburg, VA 22401",
      emergencyContact: "Karen Foster (Daughter)",
      emergencyPhone: "(540) 555-2248",
      primaryCareType: "RESPITE_CARE" as const,
      carePlanSummary: "Post-knee replacement mobility exercise support, ice pack application, light laundry, and standby assistance on stairs.",
      assignedEmployeeId: sarahCare.id,
      caregiver: sarahCare,
      baselineVitals: { temp: 98.5, bpSys: 124, bpDia: 78, hr: 72, spo2: 99, rr: 16 },
    },
    {
      id: "cli_walter_simmons",
      firstName: "Walter",
      lastName: "Simmons",
      dateOfBirth: new Date("1937-02-14"),
      phone: "(540) 555-1193",
      address: "915 Sunken Rd, Fredericksburg, VA 22401",
      emergencyContact: "Brian Simmons (Son)",
      emergencyPhone: "(540) 555-5519",
      primaryCareType: "COMPANION_CARE" as const,
      carePlanSummary: "Mild cognitive decline companionship, daily orientation cues, reading newspapers, medication supervision, and gentle porch relaxation.",
      assignedEmployeeId: sarahCare.id,
      caregiver: sarahCare,
      baselineVitals: { temp: 97.8, bpSys: 116, bpDia: 72, hr: 64, spo2: 97, rr: 14 },
    },
  ];

  const createdClients = [];
  for (const c of clientDefinitions) {
    const record = await prisma.client.create({
      data: {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        dateOfBirth: c.dateOfBirth,
        phone: c.phone,
        address: c.address,
        emergencyContact: c.emergencyContact,
        emergencyPhone: c.emergencyPhone,
        primaryCareType: c.primaryCareType,
        carePlanSummary: c.carePlanSummary,
        isActive: true,
        assignedEmployeeId: c.assignedEmployeeId,
      },
    });
    createdClients.push({ ...c, record });
  }

  console.log(`Created ${createdClients.length} clients assigned to their respective caregivers.`);

  // 4. Generate a Week-Long Progression of Shifts, Vitals Checks, and Caregiver Notes (Days -6 to 0)
  const now = new Date();
  
  const narrativeObservations = [
    "Client was alert and in cheerful spirits. Completed morning ADLs with steady gait and walker support.",
    "Vital signs checked before and after breakfast. Hydration encouraged with two full glasses of water.",
    "Assisted with personal grooming and clean outfit. Prepared fresh chicken broth and crackers for lunch.",
    "Client engaged warmly in conversation and listened to favorite music. Medication reminder completed with 100% compliance.",
    "Light housekeeping in bedroom and living room. Emptied wastebaskets and ensured all walkways are clear of tripping hazards.",
    "Midday vital signs assessment recorded. Client reported feeling energized and enjoyed afternoon sunshine on the porch.",
    "Assisted with gentle range-of-motion leg exercises as directed by physical therapy care plan. Client tolerated well without fatigue."
  ];

  const adlTaskPool = [
    ["Bathing", "Grooming", "Medication Reminder"],
    ["Meal Prep", "Housekeeping", "Hydration"],
    ["Medication Reminder", "Mobility Assist", "Walking"],
    ["Bathing", "Dressing", "Meal Prep", "Medication Reminder"],
    ["Grooming", "Housekeeping", "Companionship"],
    ["Meal Prep", "Medication Reminder", "Hydration Support"],
    ["Range of Motion", "Mobility Support", "Medication Reminder"]
  ];

  let noteCounter = 0;
  let apptCounter = 0;

  for (const client of createdClients) {
    // Generate 7 days of historical and current logs (day -6 up to today)
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const visitDate = new Date(now);
      visitDate.setDate(visitDate.getDate() - dayOffset);
      
      // Shift timing (e.g., 9:00 AM - 12:00 PM or 1:00 PM - 4:00 PM)
      const isMorning = (client.id.charCodeAt(4) + dayOffset) % 2 === 0;
      const startHour = isMorning ? 9 : 13;
      const endHour = isMorning ? 12 : 16;

      const shiftStart = new Date(visitDate);
      shiftStart.setHours(startHour, 0, 0, 0);
      const shiftEnd = new Date(visitDate);
      shiftEnd.setHours(endHour, 0, 0, 0);

      apptCounter++;
      const isFutureOrToday = dayOffset === 0;
      const shiftStatus = isFutureOrToday ? "SCHEDULED" : "COMPLETED";

      const appointment = await prisma.appointment.create({
        data: {
          id: `apt_${client.caregiver.name.toLowerCase().split(" ")[0]}_${client.firstName.toLowerCase()}_d${dayOffset}`,
          clientId: client.id,
          employeeId: client.assignedEmployeeId,
          type: "HOME_CARE_SHIFT",
          status: shiftStatus,
          startTime: shiftStart,
          endTime: shiftEnd,
          location: client.address,
          summary: `${client.primaryCareType.replace("_", " ")} shift for ${client.firstName}: personal care, routine vitals monitoring, and care plan activities.`,
        },
      });

      // Daily structured vitals with slight natural day-to-day variance
      const variance = (Math.sin(dayOffset + client.firstName.length) * 2);
      const tempVariance = (Math.sin(dayOffset * 1.5) * 0.4);
      
      const temp = Number((client.baselineVitals.temp + tempVariance).toFixed(1));
      const bpSys = Math.round(client.baselineVitals.bpSys + variance * 2);
      const bpDia = Math.round(client.baselineVitals.bpDia + variance);
      const hr = Math.round(client.baselineVitals.hr + variance * 1.5);
      const spo2 = Math.min(100, Math.max(93, Math.round(client.baselineVitals.spo2 + (dayOffset % 2 === 0 ? 0 : 1))));
      const rr = Math.round(client.baselineVitals.rr + (dayOffset % 3 === 0 ? 1 : 0));

      const narrative = narrativeObservations[dayOffset % narrativeObservations.length];
      const adlTasks = adlTaskPool[dayOffset % adlTaskPool.length];

      noteCounter++;
      await (prisma.clientNote as any).create({
        data: {
          clientId: client.id,
          employeeId: client.assignedEmployeeId,
          appointmentId: appointment.id,
          category: dayOffset % 2 === 0 ? "DAILY_CARE_LOG" : "VITALS_CHECK",
          adlTasksCompleted: JSON.stringify(adlTasks),
          content: `${narrative} Vitals measured in resting seated position. Blood pressure ${bpSys}/${bpDia} mmHg, Heart Rate ${hr} BPM, SpO2 ${spo2}%, Temp ${temp}°F. Client was comfortable throughout visit.`,
          attachmentUrl: null,
          attachmentName: null,
          attachmentType: null,
          temperature: temp,
          temperatureUnit: "F",
          bloodPressureSys: bpSys,
          bloodPressureDia: bpDia,
          heartRate: hr,
          oxygenSaturation: spo2,
          respiratoryRate: rr,
          createdAt: shiftEnd,
          updatedAt: shiftEnd,
        },
      });

      // Audit Log entry for the visit note
      await prisma.auditLog.create({
        data: {
          userId: client.assignedEmployeeId,
          action: "VISIT_NOTE_SUBMISSION",
          entityType: "ClientNote",
          entityId: `note_${client.id}_d${dayOffset}`,
          createdAt: shiftEnd,
        },
      });
    }
  }

  // 5. Create Admin Setup Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "STAFF_CREATION",
        entityType: "User",
        entityId: martha.id,
      },
      {
        userId: admin.id,
        action: "STAFF_CREATION",
        entityType: "User",
        entityId: gloria.id,
      },
      {
        userId: admin.id,
        action: "STAFF_CREATION",
        entityType: "User",
        entityId: sarahCare.id,
      },
      {
        userId: admin.id,
        action: "CLIENT_ASSIGNMENT",
        entityType: "Client",
        entityId: "cli_eleanor_vance",
      },
      {
        userId: admin.id,
        action: "CLIENT_ASSIGNMENT",
        entityType: "Client",
        entityId: "cli_harold_washington",
      },
    ],
  });

  console.log("------------------------------------------------------------------");
  console.log(`Database Seed Summary:`);
  console.log(`- 1 Admin: Shavonnah (RN Owner)`);
  console.log(`- 3 Caregivers: Martha Jenkins, Gloria Ramirez, Sarah Chen`);
  console.log(`- 10 Clients in Fredericksburg, VA with active care plans`);
  console.log(`- ${apptCounter} Shifts / Appointments scheduled & completed`);
  console.log(`- ${noteCounter} Week-long Structured Vitals & Caregiver Visit Logs`);
  console.log("------------------------------------------------------------------");
  console.log("Admin Login:     shavonnah@glamourhomecare.org / Password123!");
  console.log("Caregiver 1:     martha@glamourhomecare.org    / Password123!");
  console.log("Caregiver 2:     gloria@glamourhomecare.org    / Password123!");
  console.log("Caregiver 3:     sarah@glamourhomecare.org     / Password123!");
  console.log("------------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
