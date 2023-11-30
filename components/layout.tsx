import Head from "next/head";
import { type ReactNode } from "react";
import { type Session } from "next-auth";
import Navbar from "@components/navigation/navbar";
import Submenu from "@components/navigation/submenu";

export default function Layout({
  children,
  session,
}: {
  children: ReactNode | ReactNode[];
  session: Session | null;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Head>
        <title>Ritual</title>
        <link rel="shortcut icon" href="/vector/logo.svg" />
      </Head>

      <Navbar session={session} />
      <Submenu session={session} />
      <div className="flex flex-1">{children}</div>
    </div>
  );
}

export function Sizer({ children }: { children: ReactNode | ReactNode[] }) {
  return (
    <div className="mx-auto max-w-[1000px] w-full">
      <div className="m-8">{children}</div>
    </div>
  );
}
