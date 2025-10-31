import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { waitlist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendInternalSlackNotification } from "@/lib/server/utils";
import { after } from "next/server";

const allowedOrigins = ["https://www.devfleet.ai", "http://localhost:3000"];

function addCorsHeaders(response: NextResponse, origin?: string) {
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

const waitlistSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response, origin || undefined);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const body = await request.json();
    const { email } = waitlistSchema.parse(body);

    // Check if email already exists
    const existingEntry = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1);

    if (existingEntry.length > 0) {
      const response = NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
      return addCorsHeaders(response, origin || undefined);
    }

    // Insert new waitlist entry
    const newEntry = await db
      .insert(waitlist)
      .values({
        email,
      })
      .returning();

    after(async () => {
      await sendInternalSlackNotification(`${email} has joined the waitlist`);
    });

    const response = NextResponse.json(
      { message: "Successfully added to waitlist", data: newEntry[0] },
      { status: 201 }
    );
    return addCorsHeaders(response, origin || undefined);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response = NextResponse.json(
        { error: error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
      return addCorsHeaders(response, origin || undefined);
    }

    console.error("Waitlist signup error:", error);
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return addCorsHeaders(response, origin || undefined);
  }
}
