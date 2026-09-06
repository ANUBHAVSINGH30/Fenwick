-- DropIndex

DROP INDEX "Booking_seatId_key";

-- Create partial unique index for active bookings

CREATE UNIQUE INDEX "Booking_active_seat_unique"
ON "Booking" ("seatId")
WHERE "status" IN ('PENDING', 'CONFIRMED');