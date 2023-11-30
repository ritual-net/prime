import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@generated/command";
import { useCallback, useState } from "react";
import { Button } from "@generated/button";
import { UserPermission } from "@prisma/client";
import { ChevronsUpDown, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@generated/popover";
import { ServerMetadata } from "@type/ml/server";
import Fuse from "fuse.js";
import { useQuery } from "react-query";
import axios from "axios";
import { useRouter } from "next/router";

// Search options for Fuse.js
const FUSE_OPTIONS = {
  keys: ["id", "name"],
};

const getAllLocalServerNames = async () => {
  const response = await axios.get("/api/servers/names");
  return response.data.servers;
};

export default function ServerList({
  permission,
}: {
  permission: UserPermission;
}) {
  const { push, asPath: currentPath } = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  const { data: serverNames } = useQuery<ServerMetadata[]>(
    "servers",
    getAllLocalServerNames,
  );
  const fuse = new Fuse(serverNames ?? [], FUSE_OPTIONS);
  const results =
    search !== "" ? fuse.search(search).map((res) => res.item) : serverNames;

  const getMenuName = useCallback((): string => {
    // If path is /create, show "Create server" name
    if (currentPath === "/create") return "Create server";

    // If path starts with /server
    if (currentPath.startsWith("/server")) {
      // Collect server ID from path
      const id: string = currentPath.split("/")[2];
      // Collect server name from ID
      const server = serverNames?.find(({ id: serverId }) => serverId === id);
      // If server exists, return name
      if (server) return server.name;
    }

    // Default to "Select server"
    return "Select server";
  }, [currentPath, serverNames]);

  const handleSelect = async (server: ServerMetadata) => {
    setOpen(false);

    const newPath: string = `/server/${server.id}`;
    await push(newPath, undefined, {
      // If routing to same page as current
      // Enforce a shallow page load (don't reload serverside props)
      shallow: newPath === currentPath,
    });
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Trigger button */}
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={getMenuName()}
          className="w-[200px] justify-between"
        >
          {getMenuName()}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* Popover menu */}
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="Search servers..."
            value={search}
            onValueChange={handleSearchChange}
          />

          {results?.length === 0 ? (
            <CommandEmpty>
              <span>No servers found.</span>
            </CommandEmpty>
          ) : (
            <CommandList>
              <CommandGroup>
                {results?.map((server) => (
                  <CommandItem
                    key={server.id}
                    onSelect={() => handleSelect(server)}
                  >
                    {server.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          )}

          {/* Create server button */}
          {(permission == UserPermission.ADMIN ||
            permission == UserPermission.READ_WRITE) && (
            <>
              <CommandSeparator />
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      push("/create");
                    }}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    <span>Create server</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
