import { type UserPermission } from "@prisma/client";

export declare module "next-auth" {
  export interface User extends User {
    id: string;
    permission: UserPermission;
  }

  export interface Session {
    user?: User;
  }
}

export declare module "next-auth/adapters" {
  export interface AdapterUser extends Omit<AdapterUser, "emailVerified"> {
    id: string;
    name: string | null;
    image: string | null;
    permission: UserPermission;
  }
}
