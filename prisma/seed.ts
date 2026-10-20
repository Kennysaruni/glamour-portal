import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Glamour Homecare Portal database...");

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

  // 2. Create Caregiver: Martha Jenkins
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

  // 3. Create Caregiver: Gloria Ramirez
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

  console.log("Created users:", admin.email, martha.email, gloria.email);

  // 4. Create Clients assigned to Martha
  const eleanor = await prisma.client.create({
    data: {
      id: "cli_eleanor_vance",
      firstName: "Eleanor",
      lastName: "Vance",
      dateOfBirth: new Date("1944-03-12"),
      phone: "(540) 555-2144",
      address: "104 Washington Ave, Fredericksburg, VA 22401",
      emergencyContact: "Sarah Vance (Daughter)",
      emergencyPhone: "(540) 555-8821",
      primaryCareType: "PERSONAL_CARE",
      carePlanSummary:
        "Assistance with morning bathing, dressing, meal preparation, and medication reminders. Walker mobility support. Low sodium diet.",
      isActive: true,
      assignedEmployeeId: martha.id,
    },
  });

  const robert = await prisma.client.create({
    data: {
      id: "cli_robert_sterling",
      firstName: "Robert",
      lastName: "Sterling",
      dateOfBirth: new Date("1938-11-04"),
      phone: "(540) 555-7319",
      address: "218 Caroline St, Fredericksburg, VA 22401",
      emergencyContact: "Michael Sterling (Son)",
      emergencyPhone: "(540) 555-9034",
      primaryCareType: "COMPANION_CARE",
      carePlanSummary:
        "Companion care, cognitive stimulation, light housekeeping, hydration encouragement, and afternoon garden walks.",
      isActive: true,
      assignedEmployeeId: martha.id,
    },
  });

  // 5. Create Clients assigned to Gloria
  const evelyn = await prisma.client.create({
    data: {
      id: "cli_evelyn_moore",
      firstName: "Evelyn",
      lastName: "Moore",
      dateOfBirth: new Date("1950-07-22"),
      phone: "(540) 555-4421",
      address: "512 Fall Hill Ave, Fredericksburg, VA 22401",
      emergencyContact: "David Moore (Spouse)",
      emergencyPhone: "(540) 555-3312",
      primaryCareType: "RESPITE_CARE",
      carePlanSummary:
        "Respite relief for family spouse caregiver. Blood pressure tracking, grooming assistance, seated chair exercises, and safe transfers.",
      isActive: true,
      assignedEmployeeId: gloria.id,
    },
  });

  const harold = await prisma.client.create({
    data: {
      id: "cli_harold_washington",
      firstName: "Harold",
      lastName: "Washington",
      dateOfBirth: new Date("1942-01-19"),
      phone: "(540) 555-6820",
      address: "809 Princess Anne St, Fredericksburg, VA 22401",
      emergencyContact: "Angela Washington (Daughter)",
      emergencyPhone: "(540) 555-7762",
      primaryCareType: "PERSONAL_CARE",
      carePlanSummary:
        "Post-rehab strengthening and mobility support. Stand-by shower assist, nutrition logging, and fall prevention monitoring.",
      isActive: true,
      assignedEmployeeId: gloria.id,
    },
  });

  console.log("Created 4 clients in Fredericksburg, VA");

  // 6. Create Shifts and Appointments
  const now = new Date();
  const todayMorning = new Date(now);
  todayMorning.setHours(9, 0, 0, 0);
  const todayNoon = new Date(now);
  todayNoon.setHours(12, 0, 0, 0);

  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(10, 0, 0, 0);
  const tomorrowAfternoon = new Date(tomorrowMorning);
  tomorrowAfternoon.setHours(14, 0, 0, 0);

  const yesterdayMorning = new Date(now);
  yesterdayMorning.setDate(yesterdayMorning.getDate() - 1);
  yesterdayMorning.setHours(8, 30, 0, 0);
  const yesterdayNoon = new Date(yesterdayMorning);
  yesterdayNoon.setHours(11, 30, 0, 0);

  const appt1 = await prisma.appointment.create({
    data: {
      id: "apt_martha_eleanor_today",
      clientId: eleanor.id,
      employeeId: martha.id,
      type: "HOME_CARE_SHIFT",
      status: "SCHEDULED",
      startTime: todayMorning,
      endTime: todayNoon,
      location: eleanor.address,
      summary: "Morning personal care visit: bathing assist, meal prep, and medication reminder.",
    },
  });

  const appt2 = await prisma.appointment.create({
    data: {
      id: "apt_martha_robert_yesterday",
      clientId: robert.id,
      employeeId: martha.id,
      type: "HOME_CARE_SHIFT",
      status: "COMPLETED",
      startTime: yesterdayMorning,
      endTime: yesterdayNoon,
      location: robert.address,
      summary: "Companion shift completed: lunch prep, crossword puzzles, and garden stroll.",
    },
  });

  const appt3 = await prisma.appointment.create({
    data: {
      id: "apt_gloria_evelyn_tomorrow",
      clientId: evelyn.id,
      employeeId: gloria.id,
      type: "HOME_CARE_SHIFT",
      status: "SCHEDULED",
      startTime: tomorrowMorning,
      endTime: tomorrowAfternoon,
      location: evelyn.address,
      summary: "Respite care block: provide coverage so Mr. Moore can attend medical appointment.",
    },
  });

  const appt4 = await prisma.appointment.create({
    data: {
      id: "apt_gloria_harold_discharge",
      clientId: harold.id,
      employeeId: gloria.id,
      type: "HOSPITAL_DISCHARGE",
      status: "SCHEDULED",
      startTime: new Date(now.getTime() + 48 * 3600 * 1000),
      endTime: new Date(now.getTime() + 52 * 3600 * 1000),
      location: harold.address,
      summary: "Hospital transition care and home intake review following rehab discharge.",
    },
  });

  // 7. Create Clinical Notes & Discharge Summaries
  await prisma.clientNote.create({
    data: {
      clientId: robert.id,
      employeeId: martha.id,
      appointmentId: appt2.id,
      category: "DAILY_CARE_LOG",
      adlTasksCompleted: JSON.stringify([
        "Grooming",
        "Meal Prep",
        "Medication Reminder",
        "Housekeeping",
      ]),
      content:
        "Client was alert and in cheerful spirits today. Prepared turkey sandwich and vegetable soup for lunch. Ensured client took prescribed afternoon medications with 8oz water. Light dusting in living area and emptied trash. Client walked for 20 minutes outside in the backyard garden without unsteady gait. Client expressed gratitude for company.",
      createdAt: yesterdayNoon,
    },
  });

  await prisma.clientNote.create({
    data: {
      clientId: eleanor.id,
      employeeId: martha.id,
      category: "DISCHARGE_SUMMARY",
      adlTasksCompleted: JSON.stringify([
        "Bathing",
        "Dressing",
        "Medication Reminder",
      ]),
      content:
        "HOSPITAL DISCHARGE INTAKE SUMMARY\nFacility: Mary Washington Hospital, Fredericksburg VA\nDischarge Date: Current Week\nDiagnosis: Resolved congestive heart failure observation; mild fluid overload.\nVitals: BP 128/80 mmHg, HR 74 bpm regular, O2 Sat 98% room air, Weight 148.2 lbs.\nCaregiver Actions: Assisted Mrs. Vance safely from transport vehicle into residence. Checked kitchen and pantry for low-sodium compliance (1500mg daily restriction). Sorted medication organizers with daughter Sarah. Client educated on daily morning weight tracking protocol. Contact Dr. Henderson if weight increases >2 lbs in 24 hours.",
      createdAt: new Date(now.getTime() - 12 * 3600 * 1000),
    },
  });

  await prisma.clientNote.create({
    data: {
      clientId: evelyn.id,
      employeeId: gloria.id,
      category: "VITALS_CHECK",
      adlTasksCompleted: JSON.stringify(["Medication Reminder"]),
      content:
        "Scheduled midday vitals check. Blood pressure 126/82 mmHg, pulse 70 bpm, temperature 98.4°F. Client hydrated well (two glasses of iced water). Client rested comfortably in living room chair listening to audiobooks. Primary caregiver was able to take afternoon rest.",
      createdAt: new Date(now.getTime() - 6 * 3600 * 1000),
    },
  });

  // 8. Create Audit Logs
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
        action: "CLIENT_ASSIGNMENT",
        entityType: "Client",
        entityId: eleanor.id,
      },
      {
        userId: martha.id,
        action: "NOTE_SUBMISSION",
        entityType: "ClientNote",
        entityId: "initial-discharge-summary",
      },
    ],
  });

  console.log("Database seeded successfully!");
  console.log("------------------------------------------");
  console.log("Admin Account: shavonnah@glamourhomecare.org / Password123!");
  console.log("Caregiver 1:   martha@glamourhomecare.org    / Password123!");
  console.log("Caregiver 2:   gloria@glamourhomecare.org    / Password123!");
  console.log("------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
