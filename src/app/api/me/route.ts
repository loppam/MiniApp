import { createClient } from "@farcaster/quick-auth";
import { NextRequest } from "next/server";

const quickAuth = createClient();

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return Response.json(
      { message: "Missing authorization header" },
      { status: 401 }
    );
  }

  const payload = await quickAuth.verifyJwt({
    token: authorization.split(' ')[1],
    domain: (new URL(process.env.NEXT_PUBLIC_URL ?? '')).hostname
  })

  return Response.json({ fid: Number(payload.sub) });
}
