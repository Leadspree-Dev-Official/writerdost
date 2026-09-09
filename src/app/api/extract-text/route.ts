import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { guardRequest } from "@/lib/api-guard";

/** Uploads are parsed in-process, so the ceiling has to be conservative. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const SUPPORTED = new Set(["docx", "pdf", "txt", "md"]);

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req, { limit: 10 });
  if (blocked) return blocked;

  try {
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is larger than the 10 MB limit." },
        { status: 413 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!SUPPORTED.has(fileType)) {
      return NextResponse.json(
        { error: `File type .${fileType} is not supported.` },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is larger than the 10 MB limit." },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (fileType === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileType === "pdf") {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        extractedText = result.text;
      } finally {
        await parser.destroy();
      }
    } else {
      extractedText = buffer.toString("utf-8");
    }

    // Basic cleaning: remove empty lines and excessive whitespace
    extractedText = extractedText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n\n");

    return NextResponse.json({ text: extractedText });
  } catch (error) {
    console.error("Text extraction failed:", error);
    return NextResponse.json(
      { error: "Could not read that file. Please check it is a valid document." },
      { status: 500 },
    );
  }
}
