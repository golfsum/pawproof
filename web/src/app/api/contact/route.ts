import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(8000),
});

// Public contact form sink. Routes the message to support@pawproof.app
// via Resend. No auth required so anyone can reach us, but rate
// limited by Vercel's edge defaults at the platform layer.

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, email, subject, message } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@pawproof.app";
  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not set — message dropped on the floor");
    return NextResponse.json(
      { error: "Email service not configured. Please email support@pawproof.app directly." },
      { status: 503 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: "support@pawproof.app",
      replyTo: email,
      subject: `[Contact] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] send failed:", err);
    return NextResponse.json(
      { error: "Could not send right now. Try again or email support@pawproof.app directly." },
      { status: 500 },
    );
  }
}
