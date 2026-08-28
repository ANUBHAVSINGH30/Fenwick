import { z} from "zod";

const eventSchema = z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.number().positive(),
    date: z.iso.datetime(),
    venueId: z.string()
});

export const venueSchema = z.object({
    name: z.string().min(1),
    city: z.string().min(1),
    address: z.string().min(1),
});

export const updateEventSchema = eventSchema.partial();

export type EventSchema = z.infer<typeof eventSchema>;
export { eventSchema};
export type UpdateEventSchema = z.infer<typeof updateEventSchema>;
export type VenueSchema = z.infer<typeof venueSchema>;