declare namespace Express {
  export interface Request {
    user: {
      id: number;
      name: string;
      email: string;
      password: string;
      role: "user" | "admin";
      avatarUrl: string | null;
      bio: string | null;
      emailVerified: boolean | null;
      createdAt: Date | null;
    };
    community: {
      id: number;
      name: string;
      description: string;
      avatarUrl: string | null;
      createdBy: number | null;
      privacy: "public" | "private" | null;
      createdAt: Date | null;
    };
    file: Express.Multer.File;
  }
}
