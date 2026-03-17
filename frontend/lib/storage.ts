"use client";

export interface User {
    id: string;
    username: string;
    email: string;
    password?: string;
    profileImage?: string;
}

export interface Session {
    id: string;
    userId: string;
    name: string;
    description: string;
    status: "pending" | "completed" | "analyzing";
    lastAnalysis?: string;
    lastRunId?: string;
    createdAt: string;
    messages: any[];
}

class StorageManager {
    private readonly USERS_KEY = "jurai_users";
    private readonly SESSIONS_KEY = "jurai_features"; // Keeping legacy key for compatibility if needed, but managing better
    private readonly CURRENT_USER_KEY = "jurai_current_user";

    // --- User Management ---

    registerUser(username: string, email: string, password: string): User {
        const users = this.getUsers();
        if (users.find(u => u.email === email || u.username === username)) {
            throw new Error("User already exists");
        }

        const newUser: User = {
            id: crypto.randomUUID(),
            username,
            email,
            password // In a real app, hash this. For local storage demo, keeping it simple.
        };

        users.push(newUser);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        return newUser;
    }

    loginUser(email: string, password: string): User {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            throw new Error("Invalid credentials");
        }

        const { password: _, ...userWithoutPassword } = user;
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
        return userWithoutPassword;
    }

    logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
    }

    getCurrentUser(): User | null {
        if (typeof window === "undefined") return null;
        const data = localStorage.getItem(this.CURRENT_USER_KEY);
        return data ? JSON.parse(data) : null;
    }

    private getUsers(): User[] {
        if (typeof window === "undefined") return [];
        const data = localStorage.getItem(this.USERS_KEY);
        return data ? JSON.parse(data) : [];
    }

    // --- Session Management ---

    getSessions(userId: string): Session[] {
        if (typeof window === "undefined") return [];
        const data = localStorage.getItem(this.SESSIONS_KEY);
        const allSessions: Session[] = data ? JSON.parse(data) : [];
        // Filter by userId
        return allSessions.filter(s => s.userId === userId);
    }

    saveSession(session: Partial<Session> & { id: string; userId: string }) {
        const data = localStorage.getItem(this.SESSIONS_KEY);
        let allSessions: Session[] = data ? JSON.parse(data) : [];
        
        const index = allSessions.findIndex(s => s.id === session.id);
        if (index !== -1) {
            allSessions[index] = { ...allSessions[index], ...session };
        } else {
            // New session
            const newSession: Session = {
                name: "Untitled Assessment",
                description: "",
                status: "pending",
                createdAt: new Date().toISOString(),
                messages: [],
                ...session
            } as Session;
            allSessions.push(newSession);
        }

        localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(allSessions));
    }

    deleteSession(id: string) {
        const data = localStorage.getItem(this.SESSIONS_KEY);
        let allSessions: Session[] = data ? JSON.parse(data) : [];
        allSessions = allSessions.filter(s => s.id !== id);
        localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(allSessions));
    }

    getSession(id: string): Session | null {
        const data = localStorage.getItem(this.SESSIONS_KEY);
        const allSessions: Session[] = data ? JSON.parse(data) : [];
        return allSessions.find(s => s.id === id) || null;
    }
}

export const juraiStorage = new StorageManager();
