import { clearSessionCookie } from "@/lib/auth/session";
import { jsonOk } from "@/lib/api-utils";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({ message: "تم تسجيل الخروج" });
}
