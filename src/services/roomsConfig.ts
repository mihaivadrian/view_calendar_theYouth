import type { Room } from "../types/room";

export const ROOMS_CONFIG: Room[] = [
    {
        id: "3space@rotineret.ro",
        name: "3space",
        email: "3space@rotineret.ro",
        capacity: 30,
        color: "#3B82F6", // blue
        floor: "Parter",
        amenities: []
    },
    {
        id: "Yard@rotineret.ro",
        name: "Yard",
        email: "Yard@rotineret.ro",
        capacity: 50,
        color: "#10B981", // emerald
        floor: "Parter",
        amenities: []
    },
    {
        id: "Kitchen@rotineret.ro",
        name: "Kitchen",
        email: "Kitchen@rotineret.ro",
        capacity: 15,
        color: "#F59E0B", // amber
        floor: "Parter",
        amenities: []
    },
    {
        id: "TheDIY@rotineret.ro",
        name: "The DIY",
        email: "TheDIY@rotineret.ro",
        capacity: 20,
        color: "#8B5CF6", // violet
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheYouthBroadcast@rotineret.ro",
        name: "The Youth Broadcast",
        email: "TheYouthBroadcast@rotineret.ro",
        capacity: 10,
        color: "#EF4444", // red
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheDigitalMakerspace@rotineret.ro",
        name: "The Digital Makerspace",
        email: "TheDigitalMakerspace@rotineret.ro",
        capacity: 30,
        color: "#06B6D4", // cyan
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheArtLab@rotineret.ro",
        name: "The Art Lab",
        email: "TheArtLab@rotineret.ro",
        capacity: 20,
        color: "#EC4899", // pink
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheWay@rotineret.ro",
        name: "The Way",
        email: "TheWay@rotineret.ro",
        capacity: 30,
        color: "#F97316", // orange
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheTeam@rotineret.ro",
        name: "The Team",
        email: "TheTeam@rotineret.ro",
        capacity: 30,
        color: "#14B8A6", // teal
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheNest@rotineret.ro",
        name: "The Nest",
        email: "TheNest@rotineret.ro",
        capacity: 15,
        color: "#A855F7", // purple
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheLink@rotineret.ro",
        name: "The Link",
        email: "TheLink@rotineret.ro",
        capacity: 30,
        color: "#0EA5E9", // sky
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheBoost@rotineret.ro",
        name: "The Boost",
        email: "TheBoost@rotineret.ro",
        capacity: 25,
        color: "#84CC16", // lime
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheAction@rotineret.ro",
        name: "The Action",
        email: "TheAction@rotineret.ro",
        capacity: 40,
        color: "#F43F5E", // rose
        floor: "Etaj",
        amenities: []
    },
    {
        id: "TheAgora@rotineret.ro",
        name: "The Agora",
        email: "TheAgora@rotineret.ro",
        capacity: 100,
        color: "#6366F1", // indigo
        floor: "Parter",
        amenities: []
    }
];

// TODO: Move admin emails to server-side configuration
export const ADMIN_EMAILS = [
    "mihai.vilcea@rotineret.ro",
    "admin@rotineret.ro"
];
