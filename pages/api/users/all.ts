import db from "@db/index";
import type { User } from "@type/db/user";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Get all users in database
 * @returns {Promise<User[]>} user details
 */
export function getAllUsers(): Promise<User[]> {
  return db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      permission: true,
      createdAt: true,
    },
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get session
  const session = await getServerlessSession(req, res);
  // Check for authentication
  if (!session || session.user?.permission != UserPermission.ADMIN) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  try {
    // Get all users
    const users = await getAllUsers();
    return res.status(200).json({ users });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
