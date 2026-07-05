export async function GET() {
  return Response.json({
    ok: true,
    message: "السيرفر يعمل",
    time: new Date().toISOString(),
  });
}
