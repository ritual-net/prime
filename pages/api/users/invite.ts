import db from "@db/index";
import type { User } from "@type/db/user";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import sendInviteEmail from "@utils/emails/invite";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Invites users by email with specified permission
 * @param {string} from inviting user email
 * @param {string} email email to invite
 * @param {UserPermission} permission permission to assign user
 */
export async function inviteUser(
  from: string,
  email: string,
  permission: UserPermission,
): Promise<User> {
  // Check if user already exists
  const user = await db.user.findUnique({ where: { email } });
  if (user) throw new Error("User already exists");

  // Send invite email to user
  await sendInviteEmail({ to: email, from, permission });

  // Create user
  return await db.user.create({
    data: {
      email,
      name: email,
      permission,
    },
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
  if (
    !session ||
    session.user?.permission != UserPermission.ADMIN ||
    !session?.user.email
  ) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  // Ensure email is posted and in correct format
  const { email, permission }: { email: string; permission: UserPermission } =
    req.body;
  if (!email || !RegExp(/\S+@\S+\.\S+/).test(email)) {
    return res.status(400).json({ message: "Missing or incorrect email" });
  }

  // Ensure permission is posted and in correct format
  if (!permission || !Object.keys(UserPermission).includes(permission)) {
    return res.status(400).json({ message: "Missing or incorrect permission" });
  }

  try {
    // Create user
    const user = await inviteUser(session.user.email, email, permission);
    return res.status(200).json({ user });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
