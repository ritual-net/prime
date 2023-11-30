import { UserPermission } from "@prisma/client";

// User details
export type User = {
  id: string;
  email: string;
  name: string | null;
  permission: UserPermission;
  createdAt: Date;
};
