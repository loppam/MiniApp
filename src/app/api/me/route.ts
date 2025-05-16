import { NextRequest } from "next/server";
import { Json } from "ox";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return Response.json(
      { message: "Missing authorization header" },
      { status: 401 }
    );
  }

  console.log(authorization.split(' ')[1]);
  const res = await fetch('https://auth.farcaster.xyz/verify-token', {
    method: 'POST',
    body: Json.stringify({
      token: authorization.split(' ')[1],
      domain: (new URL(process.env.NEXT_PUBLIC_URL ?? '')).hostname,
    }),
  })

  if (!res.ok) {
    throw new Error("Request to verify token failed: " + Json.stringify(await res.json()));
  }

  const resBody = await res.json()
  if (resBody.valid) {
    return Response.json({ fid: Number(resBody.payload.sub) });
  }

  return Response.json(
    { message: "Invalid token" },
    { status: 401 }
  );
}
