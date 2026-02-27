import { getDb } from "@/server/db";
import { inquiry } from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import { eq, isNull, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { validateUUID } from "@/lib/api/shared-utils";
import { UPDATE_STATUS_SCHEMA } from "@/lib/validation/shared-schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const logger = createLogger({
    endpoint: `/api/inquiries/${resolvedParams.id}`,
    method: "GET",
  });

  try {
    const uuidError = validateUUID(resolvedParams.id);
    if (uuidError) return uuidError;

    const { getSession } = await import("@/server/better-auth/server");
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({
      userId: session.user.id,
      inquiryId: resolvedParams.id,
    });

    const db = getDb();

    const foundInquiry = await db.query.inquiry.findFirst({
      where: and(eq(inquiry.id, resolvedParams.id), isNull(inquiry.deletedAt)),
    });

    if (!foundInquiry) {
      await logger.info("Inquiry not found", { statusCode: 404 });
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    await logger.info("Inquiry fetched successfully", {
      statusCode: 200,
      inquiryId: foundInquiry.id,
    });

    return NextResponse.json({ inquiry: foundInquiry });
  } catch (error) {
    await logger.error(
      "Error fetching inquiry",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const logger = createLogger({
    endpoint: `/api/inquiries/${resolvedParams.id}`,
    method: "PATCH",
  });

  try {
    const uuidError = validateUUID(resolvedParams.id);
    if (uuidError) return uuidError;

    const { getSession } = await import("@/server/better-auth/server");
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({
      userId: session.user.id,
      inquiryId: resolvedParams.id,
    });

    const body = await request.json();
    const validationResult = UPDATE_STATUS_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      await logger.warn("Invalid status update", {
        validationErrors: validationResult.error.flatten(),
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    const { status } = validationResult.data;
    const db = getDb();

    const foundInquiry = await db.query.inquiry.findFirst({
      where: and(eq(inquiry.id, resolvedParams.id), isNull(inquiry.deletedAt)),
    });

    if (!foundInquiry) {
      await logger.info("Inquiry not found", { statusCode: 404 });
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "claimed") {
      updateData.claimedByUserId = session.user.id;
      updateData.claimedAt = new Date();
    }

    const [updatedInquiry] = await db
      .update(inquiry)
      .set(updateData)
      .where(and(eq(inquiry.id, resolvedParams.id)))
      .returning();

    if (!updatedInquiry) {
      return NextResponse.json(
        { error: "Failed to update inquiry" },
        { status: 500 },
      );
    }

    await logger.info("Inquiry status updated", {
      statusCode: 200,
      inquiryId: updatedInquiry.id,
      newStatus: status,
    });

    return NextResponse.json({ inquiry: updatedInquiry });
  } catch (error) {
    await logger.error(
      "Error updating inquiry",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const logger = createLogger({
    endpoint: `/api/inquiries/${resolvedParams.id}`,
    method: "DELETE",
  });

  try {
    const uuidError = validateUUID(resolvedParams.id);
    if (uuidError) return uuidError;

    const { getSession } = await import("@/server/better-auth/server");
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({
      userId: session.user.id,
      inquiryId: resolvedParams.id,
    });

    const db = getDb();

    const foundInquiry = await db.query.inquiry.findFirst({
      where: and(eq(inquiry.id, resolvedParams.id), isNull(inquiry.deletedAt)),
    });

    if (!foundInquiry) {
      await logger.info("Inquiry not found", { statusCode: 404 });
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    await db
      .update(inquiry)
      .set({ deletedAt: new Date() })
      .where(and(eq(inquiry.id, resolvedParams.id)));

    await logger.info("Inquiry archived", {
      statusCode: 200,
      inquiryId: resolvedParams.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    await logger.error(
      "Error archiving inquiry",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
