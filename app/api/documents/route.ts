import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. HIPAA Compliance: Enforce Authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access to clinical document" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get("key");
    const urlParam = searchParams.get("url");

    if (!keyParam && !urlParam) {
      return NextResponse.json({ error: "No document specified" }, { status: 400 });
    }

    const rawTarget = keyParam || urlParam || "";

    // 1. Check if target is a local upload path e.g. /uploads/filename.pdf
    const isLocal = rawTarget.startsWith("/uploads/");

    if (isLocal) {
      // Local filesystem handling
      const fileName = rawTarget.replace(/^\/uploads\//, "");
      const safeFileName = path.basename(fileName);
      const filePath = path.join(process.cwd(), "public", "uploads", safeFileName);

      try {
        const fileBuffer = await readFile(filePath);
        const isPdf = safeFileName.toLowerCase().endsWith(".pdf");
        const contentType = isPdf ? "application/pdf" : "image/png";

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${safeFileName}"`,
            "Cache-Control": "private, max-age=3600",
          },
        });
      } catch (err: unknown) {
        console.error("Local file read error:", err);
        return NextResponse.json({ error: "Document not found locally" }, { status: 404 });
      }
    }

    // 2. AWS S3 Handling
    const s3Bucket = process.env.AWS_S3_BUCKET;
    const s3Region = process.env.AWS_REGION || "eu-north-1";

    if (!s3Bucket) {
      // If S3 bucket is not set, fallback to public/uploads
      const safeFileName = path.basename(rawTarget);
      const filePath = path.join(process.cwd(), "public", "uploads", safeFileName);
      try {
        const fileBuffer = await readFile(filePath);
        const isPdf = safeFileName.toLowerCase().endsWith(".pdf");
        const contentType = isPdf ? "application/pdf" : "image/png";

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${safeFileName}"`,
            "Cache-Control": "private, max-age=3600",
          },
        });
      } catch {
        return NextResponse.json({ error: "S3 storage is not configured" }, { status: 500 });
      }
    }

    // Extract S3 Key from raw URL or key parameter
    // e.g. "https://bucket.s3.region.amazonaws.com/summaries/file.pdf" -> "summaries/file.pdf"
    let s3Key = keyParam || "";
    if (!s3Key && urlParam) {
      try {
        const parsedUrl = new URL(urlParam);
        s3Key = parsedUrl.pathname.replace(/^\/+/, "");
      } catch {
        s3Key = urlParam.replace(/^https?:\/\/[^\/]+\/+/, "").split("?")[0];
      }
    }

    // Clean up any double leading slashes
    s3Key = s3Key.replace(/^\/+/, "");

    // Strip bucket prefix if path-style
    if (s3Bucket && s3Key.startsWith(`${s3Bucket}/`)) {
      s3Key = s3Key.slice(s3Bucket.length + 1);
    }

    const s3Client = new S3Client({
      region: s3Region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });

    const s3Response = await s3Client.send(
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
      })
    );

    const bytes = await s3Response.Body?.transformToByteArray();
    if (!bytes) {
      return NextResponse.json({ error: "Empty or missing document from S3" }, { status: 404 });
    }

    const isPdf = s3Key.toLowerCase().endsWith(".pdf");
    const isPng = s3Key.toLowerCase().endsWith(".png");
    const defaultType = isPdf ? "application/pdf" : isPng ? "image/png" : "application/octet-stream";
    const contentType = s3Response.ContentType || defaultType;
    const fileName = path.basename(s3Key);

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve document";
    console.error("Document viewing error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
