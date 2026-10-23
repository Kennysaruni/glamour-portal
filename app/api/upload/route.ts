import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate mime type
    const mimeType = file.type.toLowerCase();
    const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isPng = mimeType === "image/png" || file.name.toLowerCase().endsWith(".png");

    if (!isPdf && !isPng) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF documents and PNG images are allowed." },
        { status: 400 }
      );
    }

    // Limit size to 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 15MB size limit." },
        { status: 400 }
      );
    }

    const ext = isPdf ? "pdf" : "png";
    const contentType = isPdf ? "application/pdf" : "image/png";
    const randomHex = crypto.randomBytes(8).toString("hex");
    const safeBaseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 30);
    const uniqueFileName = `${safeBaseName}_${Date.now()}_${randomHex}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const s3Bucket = process.env.AWS_S3_BUCKET;
    const s3Region = process.env.AWS_REGION || "eu-north-1";

    // If AWS S3 is configured, upload directly to S3
    if (s3Bucket) {
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

      const s3Key = `summaries/${uniqueFileName}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: contentType,
          ContentDisposition: `inline; filename="${encodeURIComponent(file.name)}"`,
        })
      );

      const s3Url = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${s3Key}`;
      const documentProxyUrl = `/api/documents?key=${encodeURIComponent(s3Key)}`;

      return NextResponse.json({
        success: true,
        url: documentProxyUrl,
        rawS3Url: s3Url,
        s3Key: s3Key,
        originalName: file.name,
        fileType: ext,
        size: file.size,
        storage: "s3",
      });
    }

    // Fallback to local storage (e.g. for offline development)
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, uniqueFileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${uniqueFileName}`,
      originalName: file.name,
      fileType: ext,
      size: file.size,
      storage: "local",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
