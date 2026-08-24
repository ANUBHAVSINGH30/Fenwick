import { PrismaClient } from "../src/generated/prisma/client";
import { SeatStatus } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting seed...");

  // Create users
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const users = await Promise.all(
    Array.from({ length: 5 }, () =>
      prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          passwordHash
        },
      }),
    ),
  );

  console.log(`Created ${users.length} users`);

  // Create venues
  const venues = await Promise.all(
    Array.from({ length: 3 }, () =>
      prisma.venue.create({
        data: {
          name: faker.company.name(),
          city: faker.location.city(),
          address: faker.location.streetAddress(),
        },
      }),
    ),
  );

  console.log(`Created ${venues.length} venues`);

  // Create events
  const events = [];

  for (let i = 0; i < 10; i++) {
    const venue = faker.helpers.arrayElement(venues);

    const event = await prisma.event.create({
      data: {
        title: faker.music.songName(),
        description: faker.lorem.sentence(),
        category: faker.helpers.arrayElement([
          "Concert",
          "Movie",
          "Sports",
          "Theatre",
          "Comedy",
        ]),
        date: faker.date.future(),
        price: faker.number.float({
          min: 200,
          max: 5000,
          fractionDigits: 2,
        }),
        venueId: venue.id,
      },
    });

    events.push(event);
  }

  console.log(`Created ${events.length} events`);

  // Create seats for every event
  let seatCount = 0;

  for (const event of events) {
    const seats = [];

    for (let row = 1; row <= 10; row++) {
      for (let number = 1; number <= 10; number++) {
        seats.push({
          row: `R${row}`,
          number,
          status: SeatStatus.AVAILABLE,
          eventId: event.id,
        });
      }
    }

    await prisma.seat.createMany({
      data: seats,
    });

    seatCount += seats.length;
  }

  console.log(`Created ${seatCount} seats`);

  console.log("✅ Seed completed");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });