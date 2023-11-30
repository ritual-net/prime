import { withAuth } from "@utils/auth";
import { getServer } from "@api/servers/get";
import Layout, { Sizer } from "@components/layout";
import type { GetServerSidePropsContext } from "next";
import { getSession, useSession } from "next-auth/react";
import { type Server } from "@type/ml/server";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/generated/ui/table";
import { INFERENCE_OPTIONS } from "@utils/tgi";

export default function Usage({ server }: { server: Server }) {
  const { data: session } = useSession();

  const ip = server.ip ?? "<ip address>";

  const nodeString = `fetch("http://${ip}:8080/generate_stream", {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inputs: "Deep Learning is ",
    parameters: { max_new_tokens: 256, temperature: 1 },
    uuid: "123e4567-e89b-12d3-a456-426614174000"
  })
})`;

  const curlString = `curl ${ip}:8080/generate_stream -X POST -H 'Content-Type: application/json' \\
  -d '{
    "inputs": "Deep Learning is ",
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "parameters": { "max_new_tokens": 256, "temperature": 1 }
  }'`;

  return (
    <Layout session={session}>
      <Sizer>
        <div className="flex flex-col p-5 align-left">
          <h1 className="font-normal mb-10">Usage examples</h1>

          <h4 className="font-semibold">Node.js</h4>
          <SyntaxHighlighter
            language="javascript"
            customStyle={{
              fontSize: "15px",
              borderRadius: 5,
              padding: 20,
            }}
          >
            {nodeString}
          </SyntaxHighlighter>

          <h4 className="font-semibold mt-5">cURL</h4>
          <SyntaxHighlighter
            customStyle={{
              fontSize: "12px",
              borderRadius: 5,
              padding: 20,
            }}
          >
            {curlString}
          </SyntaxHighlighter>

          <h1 className="font-normal mt-10 mb-10">Inference Parameters</h1>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contraints</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {INFERENCE_OPTIONS.map((option) => (
                  <TableRow key={option.key}>
                    <TableCell>{option.key}</TableCell>
                    <TableCell>{option.type}</TableCell>
                    <TableCell>{option.constraint}</TableCell>
                    <TableCell>{option.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Sizer>
    </Layout>
  );
}

export const getServerSideProps = withAuth(
  async (context: GetServerSidePropsContext) => {
    // Collect server ID from URL
    let id: string | string[] | undefined = context.params?.id;

    try {
      // If no ID found, throw error (not caught, just to break control flow)
      if (!id) throw new Error();
      // If more than one ID found, use first
      if (Array.isArray(id)) id = id[0];

      // Collect session details
      const session = await getSession(context);
      // Collect server details by ID
      const server = await getServer(id);

      // Return details
      return {
        props: {
          session,
          server,
        },
      };
    } catch {
      // In case of any errors, redirect to dashboard
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }
  },
);
