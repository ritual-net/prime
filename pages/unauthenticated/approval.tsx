import { FileLock } from "lucide-react";
import Layout from "@components/layout";
import { useSession } from "next-auth/react";
import { withAuthOnlySessionReturned } from "@utils/auth";

export default function Approval() {
  const { data: session } = useSession();

  return (
    <Layout session={session}>
      <div className="flex flex-col w-full m-5 border-2 border-dashed border-zinc-200 p-3 rounded-sm">
        <div className="m-auto text-center">
          <FileLock className="mx-auto h-10 w-10" />
          <h1 className="my-2">Pending Approval</h1>
          <p className="max-w-[500px]">
            This email is associated with a new account. Your workspace
            administrator must approve your request to join.
          </p>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps = withAuthOnlySessionReturned();
