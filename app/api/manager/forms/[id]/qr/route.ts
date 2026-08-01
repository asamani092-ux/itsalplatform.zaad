import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError } from "@/lib/api-utils";
import { getAppUrl } from "@/lib/api-utils";
import { getFormById } from "@/lib/forms/server";
import { formPublicPath } from "@/lib/forms/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const form = await getFormById(id);
    if (!form) throw new Error("NOT_FOUND: النموذج غير موجود");

    const url = `${getAppUrl()}${formPublicPath(form.slug)}`;
    const png = await QRCode.toBuffer(url, {
      width: 512,
      margin: 2,
      color: { dark: "#8B1538", light: "#FFFFFF" },
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="qr-${form.slug}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
