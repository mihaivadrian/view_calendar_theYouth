export interface Room {
    id: string;
    name: string;
    email: string; // The resource email
    capacity: number;
    color: string;
    floor: string;
    amenities: string[];
    isVisible?: boolean; // Controlled by admin
}

export type RoomId = string;
