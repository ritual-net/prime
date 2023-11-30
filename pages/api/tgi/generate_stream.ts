import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get session
  const session = await getServerlessSession(req, res);
  // Check for authentication (accessible to all approved users)
  if (!session || session.user?.permission === UserPermission.NONE) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  // Collect parameters from body
  const {
    ip,
    prompt,
    parameters,
  }: {
    ip: string;
    prompt: string;
    parameters: {
      max_new_tokens: number;
      temperature: number;
      top_p: number;
      repition_penalty: number;
    };
  } = req.body;
  // Throw if missing necessary parameters
  if (!ip || !prompt || !parameters) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    // Create new request stream
    const { status, data } = await axios({
      method: "POST",
      url: `http://${ip}:8080/generate_stream`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        inputs: prompt,
        parameters,
        uuid: uuidv4(),
      },
      responseType: "stream",
    });

    // Check for a successful response
    if (status !== 200) {
      throw new Error("Errored opening SSE stream");
    }

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Pipe the response stream directly to the caller
    data.pipe(res);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch data" });
  }
}
