import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Helper for security token verification
const verifyToken = (reqToken: string) => {
  const secureToken = process.env.WEB_API_KEY || "aura_secret_token_123456";
  return reqToken === secureToken;
};

export async function POST(request: Request) {
  try {
    const { account, command, symbol = "", token } = await request.json();

    if (!account || !command) {
      return NextResponse.json(
        { error: "Account and Command are required" },
        { status: 400 }
      );
    }

    // Secure command authentication check (BUG-D13)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validCommands = ["PAUSE", "RESUME", "PANIC_LOCAL", "PANIC_GLOBAL", "RESET_STATS"];
    if (!validCommands.includes(command)) {
      return NextResponse.json(
        { error: `Invalid command. Must be one of: ${validCommands.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if there is already a pending identical command
    const existing = await prisma.commandQueue.findFirst({
      where: {
        account: String(account),
        command,
        symbol,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json({
        status: "already_queued",
        message: "Command is already pending execution by the robot.",
        commandId: existing.id,
      });
    }

    // Insert the new command
    const newCommand = await prisma.commandQueue.create({
      data: {
        account: String(account),
        command,
        symbol,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Command queued successfully.",
      commandId: newCommand.id,
    });
  } catch (error: any) {
    console.error("Dashboard Command Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
