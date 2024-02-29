import Fuse from "fuse.js";
import Link from "next/link";
import { useState } from "react";
import { withAuth } from "@utils/auth";
import { useRouter } from "next/router";
import { Button } from "@generated/button";
import type { Server } from "@type/ml/server";
import { UserPermission } from "@prisma/client";
import { getAllServers } from "@api/servers/all";
import StatusIndicator from "@components/status";
import { Separator } from "@generated/separator";
import Layout, { Sizer } from "@components/layout";
import type { GetServerSidePropsContext } from "next";
import { Input } from "@components/generated/ui/input";
import { getSession, useSession } from "next-auth/react";
import { Cpu, Globe, PlusCircle, ServerOff } from "lucide-react";

// Search options for Fuse.js
const FUSE_OPTIONS = {
  keys: ["name", "description", "os", "specs.gpu.model", "provider"],
};

export default function Home({
  servers: defaultServers,
}: {
  servers: Server[];
}) {
  const { push } = useRouter();
  const { data: session } = useSession();

  // Local state
  const [search, setSearch] = useState<string>("");
  const fuse = new Fuse(defaultServers, FUSE_OPTIONS);
  const servers: Server[] =
    // If no search, return all servers, else return fuse search results
    search === "" ? defaultServers : fuse.search(search).map((res) => res.item);

  // User has permissions to create a server
  const userCanCreate: boolean =
    session?.user?.permission !== UserPermission.READ;

  return (
    <Layout session={session}>
      <Sizer>
        {/* CreateCTA if privileged */}
        {userCanCreate && <CreateCTA push={push} />}

        {/* Header */}
        <div className="flex flex-row justify-between my-4">
          {/* Page title */}
          <div className="flex flex-col w-1/2 justify-center">
            <h1 className="font-semibold">Servers</h1>
          </div>

          {/* Server filter */}
          <div className="flex justify-end w-1/2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-[300px]"
              placeholder="Search servers..."
              disabled={defaultServers.length === 0}
            />
          </div>
        </div>

        {/* Servers */}
        <div className="flex bg-zinc-100 border-2 border-zinc-200 p-8 rounded-sm">
          {/* Default: no servers found */}
          {servers.length === 0 && <EmptyState canCreate={userCanCreate} />}

          {/* Some servers exist */}
          {servers.length > 0 && <ServerList servers={servers} push={push} />}
        </div>
      </Sizer>
    </Layout>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    // No servers found
    <div className="mx-auto my-6 text-center">
      <ServerOff className="mx-auto h-10 w-10 mb-2" />
      <h3 className="font-medium">No servers found</h3>

      {!canCreate ? (
        // No permission to make new servers
        <p className="font-light">
          A privileged user must first create a server.
        </p>
      ) : (
        <p>
          Begin by creating a{" "}
          <Link
            className="underline underline-offset-4 hover:opacity-70 transition-opacity"
            href="/create"
          >
            new server
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function CreateCTA({ push }: { push: (path: string) => void }) {
  return (
    <div className="flex flex-col md:flex-row justify-between bg-zinc-900 rounded-md p-4 mb-10">
      {/* Left text */}
      <div>
        <h3 className="text-zinc-100 font-semibold">Create server</h3>
        <p className="text-zinc-300 font-normal">
          Provision a new server for ML inference.
        </p>
      </div>

      {/* Right action button */}
      <div className="flex flex-col justify-center mt-4 md:mt-0">
        <Button onClick={() => push("/create")} variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          <span>Create server</span>
        </Button>
      </div>
    </div>
  );
}

function ServerList({
  servers,
  push,
}: {
  servers: Server[];
  push: (path: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
      {/* Grid render server component */}
      {servers.map((server: Server, i: number) => (
        <Server server={server} push={push} key={i} />
      ))}
    </div>
  );
}

function Server({
  server,
  push,
}: {
  server: Server;
  push: (path: string) => void;
}) {
  return (
    <Button
      onClick={() => push(`/server/${server.id}`)}
      className="flex flex-col text-left justify-start h-auto p-0"
      variant="outline"
    >
      <div className="w-full">
        {/* Status light, server name, description */}
        <div className="flex flex-row px-4 pt-4 pb-2 items-center">
          {/* Status light */}
          <StatusIndicator status={server.status} displayText={false} />

          {/* Server name + description */}
          <div className="ml-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              {server.name}
            </h3>
            <p className="text-xs font-light line-clamp-1">
              {server.description}
            </p>
          </div>
        </div>

        <Separator className="mt-2 mb-3" />

        {/* Server provider + IP */}
        <div className="flex flex-row px-4 pb-2 items-center">
          <Globe className="mr-2 h-3 w-3" />
          <p className="text-xs font-light">
            {server.provider} • {server.ip}
          </p>
        </div>

        {/* Server CPU, RAM, GPU */}
        <div className="flex flex-row px-4 pb-3 items-center">
          <Cpu className="mr-2 h-3 w-3" />
          <p className="text-xs font-light">
            {server.specs.cores} vCPU • {server.specs.ram}GB RAM •{" "}
            {server.specs.gpu.count}
            {"x "}
            {server.specs.gpu.model}
          </p>
        </div>
      </div>
    </Button>
  );
}

export const getServerSideProps = withAuth(
  async (context: GetServerSidePropsContext) => {
    const session = await getSession(context);

    // Collect all servers
    const servers = await getAllServers();

    return {
      props: {
        session,
        servers,
      },
    };
  },
);
