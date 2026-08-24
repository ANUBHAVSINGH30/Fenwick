import { z} from "zod";

const eventSchema = z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.number().positive(),
    date: z.iso.datetime(),
    venueId: z.string()
});

export type EventSchema = z.infer<typeof eventSchema>;
export { eventSchema};