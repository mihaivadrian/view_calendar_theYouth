import type { Room } from "../types/room";

export const ROOMS_CONFIG: Room[] = [
    {
        id: "sala-mare",
        name: "Sala Mare",
        email: "sala.mare@rotineret.ro",
        capacity: 50,
        color: "#3B82F6", // blue-500
        floor: "Parter",
        amenities: ["proiector", "flipchart", "AC"]
    },
    {
        id: "sala-mica",
        name: "Sala Mică",
        email: "sala.mica@rotineret.ro",
        capacity: 15,
        color: "#10B981", // emerald-500
        floor: "Parter",
        amenities: ["TV", "whiteboard"]
    },
    {
        id: "sala-training",
        name: "Sala Training",
        email: "sala.training@rotineret.ro",
        capacity: 30,
        color: "#F59E0B", // amber-500
        floor: "Etaj 1",
        amenities: ["proiector", "flipchart", "AC", "sistem audio"]
    },
    {
        id: "coworking",
        name: "Spațiu Coworking",
        email: "coworking@rotineret.ro",
        capacity: 20,
        color: "#8B5CF6", // violet-500
        floor: "Etaj 1",
        amenities: ["prize multiple", "WiFi dedicat"]
    },
    {
        id: "sala-board",
        name: "Sala Board",
        email: "sala.board@rotineret.ro",
        capacity: 12,
        color: "#EF4444", // red-500
        floor: "Etaj 2",
        amenities: ["TV", "sistem videoconferință", "AC"]
    }
];

export const ADMIN_EMAILS = [
    "mihai.vilcea@rotineret.ro",
    "admin@rotineret.ro"
];
