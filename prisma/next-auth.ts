// @ts-nocheck
import { type Adapter } from "next-auth/adapters";
import { User, type PrismaClient } from "@prisma/client";

// Fields to select from DB for AdapterUser
const SELECT_ADAPTER_USER = {
  id: true,
  name: true,
  image: true,
  email: true,
  permission: true,
};

/**
 * Next-auth adapter for fine-tuned control over DB interactions.
 * Note(AA): this is not required, given next-auth provides a basic Prisma adapter that works
 * for effectively all use cases, but I find it good to go through the motions of implementing
 * the functionality in case future maintainers need to change logic. It also makes maintaining
 * the schema much easier than co-opting the default one provided by next-auth (which doesnt make
 * much sense to me).
 * Reference: https://github.com/nextauthjs/next-auth/blob/main/packages/adapter-prisma/src/index.ts
 * @param {PrismaClient} client db adapter
 * @returns {Adapter} next-auth adapter implementation
 */
export default function DBAdapter(client: PrismaClient): Adapter {
  return {
    async createUser(user) {
      return await client.user.create({
        data: { email: user.email, name: user.email },
        select: SELECT_ADAPTER_USER,
      });
    },
    async getUser(id: string) {
      const user = await client.user.findUnique({
        where: { id },
        select: SELECT_ADAPTER_USER,
      });
      if (!user) return null;
      return user;
    },
    async getUserByEmail(email: string) {
      const user = await client.user.findUnique({
        where: { email: email },
        select: SELECT_ADAPTER_USER,
      });
      if (!user) return null;
      return user;
    },
    // Not implemented (unncessary for email auth)
    async getUserByAccount({
      providerAccountId,
      provider,
    }: {
      providerAccountId: string;
      provider: string;
    }) {
      return null;
    },
    async updateUser(user) {
      const updatedUser = await client.user.update({
        where: {
          id: user.id,
        },
        data: {
          // Don't allow updating ID
          email: user.email,
        },
        select: SELECT_ADAPTER_USER,
      });

      return updatedUser;
    },
    async deleteUser(userId: string) {
      await client.user.delete({
        where: { id: userId },
      });
    },
    // Not implemented (unnecessary for email auth)
    async linkAccount(account) {
      return null;
    },
    // Not implemented (unnecessary for email auth)
    async unlinkAccount(providerAccountId) {
      return;
    },
    async createSession({ sessionToken, userId, expires }) {
      const {
        token: t,
        userId: u,
        expires: e,
      } = await client.session.create({
        data: {
          token: sessionToken,
          userId,
          expires,
        },
      });

      return { sessionToken: t, userId: u, expires: e };
    },
    async getSessionAndUser(sessionToken) {
      const result = await client.session.findUnique({
        where: { token: sessionToken },
        include: {
          user: {
            select: SELECT_ADAPTER_USER,
          },
        },
      });
      if (!result) return null;

      return {
        user: result?.user,
        session: {
          sessionToken: result.token,
          userId: result.userId,
          expires: result.expires,
        },
      };
    },
    async updateSession({ sessionToken, ...rest }) {
      const session = await client.session.update({
        where: { token: sessionToken },
        data: rest,
      });

      return {
        sessionToken: session.token,
        userId: session.userId,
        expires: session.expires,
      };
    },
    async deleteSession(sessionToken) {
      const deleted = await client.session.delete({
        where: { token: sessionToken },
      });

      return {
        sessionToken: deleted.token,
        userId: deleted.userId,
        expires: deleted.expires,
      };
    },
    async createVerificationToken({ identifier, expires, token }) {
      const {
        id,
        token: t,
        expires: e,
      } = await client.emailVerificationTokens.create({
        data: {
          userId: identifier,
          token,
          expires,
        },
      });

      return { identifier: id, token: t, expires: e };
    },
    async useVerificationToken({
      identifier,
      token,
    }: {
      identifier: string;
      token: string;
    }) {
      try {
        const {
          id,
          token: t,
          expires,
        } = await client.emailVerificationTokens.delete({
          where: { token: token },
        });
        return { identifier: id, token: t, expires };
      } catch {
        // If already deleted
        return null;
      }
    },
  };
}
