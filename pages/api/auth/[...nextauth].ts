import db from "@db/index";
import NextAuth from "next-auth/next";
import DBAdapter from "@db/next-auth";
import EmailProvider from "next-auth/providers/email";
import { type AdapterUser } from "next-auth/adapters";
import emailVerification from "@utils/emails/verification";
import { type NextAuthOptions, type Session } from "next-auth";

// Setup passwordless-email provider
const emailProvider = EmailProvider({
  server: {
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  },
  from: process.env.EMAIL_FROM,
  sendVerificationRequest: emailVerification,
});

// Authentiation options
export const authOptions: NextAuthOptions = {
  adapter: DBAdapter(db),
  providers: [emailProvider],
  // Custom page overrides
  pages: {
    signIn: "/unauthenticated/login",
  },
  callbacks: {
    /**
     * Overload session request callback to attach additional params
     * @param {Session} session to modify
     * @param {AdapterUser} user details
     * @returns {Session} modified session
     */
    async session({ session, user }: { session: Session; user: AdapterUser }) {
      // // Attach parameters
      if (session.user) {
        const { id, permission } = user;
        session.user = {
          ...session.user,
          id,
          permission,
        };
      }

      // Return modified session
      return session;
    },
  },
};

// Configure routes
export default NextAuth(authOptions);
