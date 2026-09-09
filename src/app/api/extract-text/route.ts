import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    const fileType = file.name.split(".").pop()?.toLowerCase();

    if (fileType === "docx") {
       const result = await mammoth.extractRawText({ buffer });
       extractedText = result.value;
    } else if (fileType === "pdf") {
       const parser = new PDFParse({ data: buffer });
       const result = await parser.getText();
       extractedText = result.text;
       await parser.destroy();
    } else if (fileType === "txt" || fileType === "md") {
       extractedText = buffer.toString("utf-8");
    } else {
       return NextResponse.json({ error: `File type .${fileType} is not supported.` }, { status: 400 });
    }

    // Basic cleaning: remove empty lines and excessive whitespace
    extractedText = extractedText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join("\n\n");

    return NextResponse.json({ text: extractedText });
  } catch (error) {
    console.error("Text extraction failed:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error during text extraction" 
    }, { status: 500 });
  }
}
