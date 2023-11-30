import db from "@db/index";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Deletes user
 * @param {string} id user ID
 */
export async function deleteUser(id: string): Promise<void> {
  // Get number of admins
  const adminCount: number = await db.user.count({
    where: { permission: UserPermission.ADMIN },
  });

  // Get permission status of user to delete
  const user = await db.user.findUnique({
    where: { id },
    select: { permission: true },
  });
  if (!user) throw new Error("User not found");

  // If user to delete is admin, ensure at least one other admin exists
  if (user.permission == UserPermission.ADMIN && adminCount <= 1) {
    throw new Error("Cannot delete only admin");
  }

  // Delete user
  await db.user.delete({ where: { id } });
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

  // Get id from request body
  const { id }: { id: string } = req.body;
  if (!id) return res.status(400).json({ message: "Missing user ID" });

  // Delete user
  try {
    await deleteUser(id);
    return res.status(200).end();
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
