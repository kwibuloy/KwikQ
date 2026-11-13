export const ROLES = ['patient', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export interface User {
    user_id: string; 
    email: string;
    user_first_name: string;
    user_last_name: string;
    role: Role;
    created_at?: Date;
    updated_at?: Date;
}

export interface Doctor {
    doctor_id: string | number;
    doctor_first_name: string;
    doctor_last_name: string;
    specialization: string;
    is_available: boolean;
    room_number?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface QueueEntry {
    queue_id: string;
    user_id: string; 
    doctor_id: string | number;
    ticket_number: number;
    status: 'waiting' | 'called' | 'in-consultation' | 'served' | 'cancelled';
    created_at: Date;
    updated_at?: Date;
}

export interface AdminQueueView {
    queue_id: string;
    ticket_number: number;
    patient_name: string;
    status: string;
    arrival_time: string;
}

export interface PatientStatus {
    queue_id: string;
    ticket_number: number;
    status: string;
    position_in_queue?: number;
}

export interface QueueHistoryView {
    id: string;
    ticket_number: number;
    status: string;
    created_at: Date;
    doctor_id: string | number;
    doctor_name: string;
    doctor_specialization: string;
    doctor_room?: string;
}

export interface AdminInvitation {
    invitation_id: string;
    email: string;
    invitation_code?: string;
    created_at: Date;
    expires_at?: Date;
}

export interface RegisterRequest {
    email: string;
    password: string;
    user_first_name: string;
    user_last_name: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    user?: User;
    role?: string;
    session?: unknown;
}

export interface SupabaseUser {
    id: string; // UUID
    email: string;
    user_metadata?: {
        user_first_name?: string;
        user_last_name?: string;
        role?: string;
    };
    [key: string]: unknown;
}
