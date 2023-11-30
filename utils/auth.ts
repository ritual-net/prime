import {
  type NextApiRequest,
  type GetServerSidePropsContext,
  type GetServerSidePropsResult,
  type NextApiResponse,
} from "next";
import { getSession } from "next-auth/react";
import { UserPermission } from "@prisma/client";
import { type Session, getServerSession } from "next-auth";
import { authOptions } from "@pages/api/auth/[...nextauth]";

/**
 * Permission rankings:
 *
 * ----------------------------------
 * Permission: Not logged in
 * - Default to unauthenticated/login.tsx
 *
 * Permission: NONE
 * - Default to unauthenticated/approval.tsx
 *
 * Permission: READ
 * - Default to dashboard
 * - Access to:
 *  - Dashboard
 *  - Server pages
 *  - Settings: Profile
 *
 * Permission: READ_WRITE
 * - Default to dashboard
 * - Access to all of READ +:
 *  - Create new server
 *
 * Permission: ADMIN:
 * - Default to dashboard
 * - Access to all of READ_WRITE +:
 *  - Settings: Users
 *  - Settings: Connect Keys
 *  - Settings: Logs
 */
export const PERMISSIONS = {
  [UserPermission.NONE]: {
    allowed: ["/unauthenticated/approval"],
    default: "/unauthenticated/approval",
  },
  [UserPermission.READ]: {
    allowed: ["/", "/server", "/settings/account"],
    default: "/",
  },
  [UserPermission.READ_WRITE]: {
    allowed: ["/create"],
    default: "/",
  },
  [UserPermission.ADMIN]: {
    allowed: ["/settings/users", "/settings/redaction", "/settings/keys"],
    default: "/",
  },
};

/**
 * HOC to wrap getServerSideProps to handle authentication
 * @param handler getServerSideProps handler
 * @returns HOC
 */
export function withAuth(
  handler: (
    context: GetServerSidePropsContext,
  ) => Promise<GetServerSidePropsResult<{ [key: string]: unknown }>>,
) {
  return async function nextGetServerSidePropsHandlerWrappedWithAuth(
    context: GetServerSidePropsContext,
  ) {
    // Get session details
    const session: Session | null = await getSession(context);
    // Get page from context
    let path: string = context.resolvedUrl;

    // Get permission level from session
    const permission: UserPermission | undefined = session?.user?.permission;
    // Redirect if no permission level
    if (!permission) {
      if (path !== "/unauthenticated/login") {
        return {
          redirect: {
            destination: "/unauthenticated/login",
            permanent: false,
          },
        };
      } else {
        return handler(context);
      }
    }

    // Redirect if accessing login page when already authenticated
    if (permission && path === "/unauthenticated/login") {
      return {
        redirect: {
          destination: PERMISSIONS[permission].default,
          permanent: false,
        },
      };
    }

    // Redirect away from approval if already approved
    if (
      permission != UserPermission.NONE &&
      path == "/unauthenticated/approval"
    ) {
      return {
        redirect: {
          destination: PERMISSIONS[permission].default,
          permanent: false,
        },
      };
    }

    // Manage permission handling
    let allowedPaths: string[] = [];
    for (const [level, config] of Object.entries(PERMISSIONS)) {
      // Append allowed paths if permission level is less than
      // or equal to current permission level
      allowedPaths.push(...config.allowed);
      if (level == permission) break;
    }
    if (path.startsWith("/server")) {
      path = "/server";
    }
    // Break if permission level insufficient
    if (!allowedPaths.includes(path)) {
      return {
        redirect: {
          destination: PERMISSIONS[permission].default,
          permanent: false,
        },
      };
    }

    // Return the handler to continue page operations
    return handler(context);
  };
}

/**
 * HOC to wrap withAuth to handle authentication and return session
 *
 * Basically, a simple wrapper around auth handling for pages that
 * require no additional data fetching besides auth details
 * @returns HOC
 */
export function withAuthOnlySessionReturned() {
  return withAuth(async (context: GetServerSidePropsContext) => {
    // Get session details
    const session = await getSession(context);

    // Return session as prop
    return {
      props: {
        session,
      },
    };
  });
}

/**
 * Get session details from server
 * @param {NextApiRequest} req request
 * @param {NextApiResponse} res response
 * @returns {Promise<Session | null>} session details
 */
export function getServerlessSession(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return getServerSession(req, res, authOptions);
}
