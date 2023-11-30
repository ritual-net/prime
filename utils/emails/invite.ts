import type { UserPermission } from "@prisma/client";
import { EMAIL_FROM, getEmailTransport } from "@utils/emails/index";

const AUTH_PAGE: string = `${process.env.NEXTAUTH_URL}/unauthenticated/login`;

/**
 * Sends invitation email to new Prime user
 * @param {string} to invited user email
 * @param {string} from inviting user email
 * @param {UserPermission} permission invited user permission level
 * @returns {Promise<void>}
 */
export default function sendInviteEmail({
  to,
  from,
  permission,
}: {
  to: string;
  from: string;
  permission: UserPermission;
}): Promise<void> {
  // Promisify nodemailer request
  return new Promise((resolve, reject) => {
    // Create new transport
    const transport = getEmailTransport();

    // Create mail
    transport.sendMail(
      {
        to,
        // Send from main email address
        from: EMAIL_FROM,
        subject: "You have been invited to join Prime",
        // Render text if email client does not support html
        text: text({ from, permission }),
        // Else, render html
        html: html({ from, permission }),
      },
      (error: Error | null) => {
        // If error, reject promise
        if (error) {
          return reject(new Error(error.message));
        }

        // Else, resolve
        return resolve();
      },
    );
  });
}

/**
 * Renders text email
 * @param {{ to: string, from: string, permission: UserPermission }}
 * @returns {string} text email
 */
const text = ({
  from,
  permission,
}: {
  from: string;
  permission: UserPermission;
}): string =>
  `${from} has invited you to join Prime with ${
    permission as string
  } privileges.\nLogin at ${AUTH_PAGE}\n`;

/**
 * Renders html email
 * @param {{ to: string, from: string, permission: UserPermission }}
 * @returns {string} html-templated email
 */
const html = ({
  from,
  permission,
}: {
  from: string;
  permission: UserPermission;
}): string => {
  // Collect escaped email (for various email clients that might parse as link)
  const escapedEmail: string = `${from.replace(/\./g, "&#8203;.")}`;

  return `  
    <body
      style="
        background-color: #f4f4f5;
        padding: 30px;
        text-align: center;
        font-family:
          ui-sans-serif,
          system-ui,
          -apple-system,
          Roboto,
          &quot;Helvetica Neue&quot;,
          Arial,
          sans-serif;
      "
    >
      <img 
        src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjIiIGhlaWdodD0iNjIiIHZpZXdCb3g9IjAgMCA2MiA2MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMS41Mjk0IDI4LjU5OTFMMjMuNTI5MyAzMC42MTJMMzAuNDcwNSAyMy42MjU3TDI4LjQ3MDYgMjEuNjEyN0wyMS41Mjk0IDI4LjU5OTFaIiBmaWxsPSJibGFjayIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTkgMzEuMTQ0OUwxNiAzOC4xOTA1TDIwLjQ3MDYgMzMuNjkwOEwxOC40NzA2IDMxLjY3NzdMMTYgMzQuMTY0NEwxMyAzMS4xNDQ5TDE2IDI4LjEyNTRMMjMuNDcwNiAzNS42NDQ2TDI1LjQ3MDUgMzMuNjMxNkwxNS45OTk5IDI0LjA5OTRMOSAzMS4xNDQ5WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yOC41Mjk0IDI2LjY0NTNMMjYuNTI5NCAyOC42NTgyTDMzLjQ3MDYgMzUuNjQ0NkwzNS40NzA2IDMzLjYzMTZMMjguNTI5NCAyNi42NDUzWiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00MC40NzA2IDMzLjY5MDhMMzguNDcwNSAzMS42Nzc4TDMxLjUyOTQgMzguNjY0MUwzMy41Mjk0IDQwLjY3NzJMNDAuNDcwNiAzMy42OTA4WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xOSAyMS4wNzk4TDIzLjQ3MDYgMjUuNTc5NUwyNS40NzA2IDIzLjU2NjVMMjMgMjEuMDc5OUwyNiAxOC4wNjAzTDMzLjQ3MDYgMjUuNTc5NUwzNS40NzA2IDIzLjU2NjVMMjYgMTQuMDM0M0wxOSAyMS4wNzk4WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNi41Mjk0IDM4LjcyMzRMMzYgNDguMjU1Nkw0MyA0MS4yMUwzOC41Mjk0IDM2LjcxMDRMMzYuNTI5MyAzOC43MjM1TDM4Ljk5OTkgNDEuMjEwMkwzNS45OTk5IDQ0LjIyOTdMMjguNTI5MyAzNi43MTA1TDI2LjUyOTQgMzguNzIzNFoiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMzYuNTI5NCAyOC42NTgzTDQ2IDM4LjE5MDVMNTMgMzEuMTQ0OUw0NiAyNC4wOTk0TDQxLjUyOTQgMjguNTk5MUw0My41Mjk0IDMwLjYxMjFMNDYgMjguMTI1NUw0OSAzMS4xNDVMNDYgMzQuMTY0NUwzOC41Mjk0IDI2LjY0NTNMMzYuNTI5NCAyOC42NTgzWiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xOSA0MS4yMUwyNiA0OC4yNTU2TDMwLjQ3MDYgNDMuNzU1OUwyOC40NzA2IDQxLjc0MjhMMjYgNDQuMjI5NUwyMyA0MS4yMUwzMC40NzA2IDMzLjY5MDhMMjguNDcwNSAzMS42Nzc3TDE5IDQxLjIxWiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zMS41MzAzIDE4LjUzMzFMMzMuNTMwMiAyMC41NDYxTDM2LjAwMDggMTguMDU5NEwzOS4wMDA4IDIxLjA3OUwzMS41MzAyIDI4LjU5ODJMMzMuNTMwMiAzMC42MTEyTDQzLjAwMDggMjEuMDc4OUwzNi4wMDA4IDE0LjAzMzRMMzEuNTMwMyAxOC41MzMxWiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZD0iTTI3LjQxMTkgMTIuNjUxMUwzMS4wMzkzIDlMMzQuNjY2OCAxMi42NTExTDMxLjAzOTMgMTYuMzAyMkwyNy40MTE5IDEyLjY1MTFaIiBmaWxsPSJibGFjayIvPgo8cGF0aCBkPSJNMjcuNDExOSA0OS4zNDg5TDMxLjAzOTQgNDUuNjk3OEwzNC42NjY4IDQ5LjM0ODlMMzEuMDM5NCA1M0wyNy40MTE5IDQ5LjM0ODlaIiBmaWxsPSJibGFjayIvPgo8L3N2Zz4K'
        style="width: 130px; padding-bottom: 30px"
        alt="Ritual logo"
      />
      <div
        style="
          background-color: #fff;
          border-radius: 5px;
          padding: 30px 20px;
          border: 1px solid #d4d4d8;
        "
      >
        <p
          style="
            font-weight: 300;
            color: #a1a1aa;
            max-width: 700px;
            font-size: 16px;
            line-height: 150%;
            margin: 0px auto;
          "
        >
          ${escapedEmail} has invited you to join Prime with ${
            permission as string
          }
          privileges.
        </p>
        <div style="padding: 40px 0px 20px 0px">
          <a
            href="${AUTH_PAGE}"
            style="
              background-color: black;
              color: #fff;
              padding: 12.5px 30px;
              border-radius: 4px;
              font-size: 16px;
              font-weight: 500;
              text-decoration: none;
            "
            >Login to Prime</a
          >
        </div>
      </div>
    </body>
  `;
};
