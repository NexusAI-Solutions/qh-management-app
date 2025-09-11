// app/api/airtable/route.ts
import { NextResponse } from "next/server";
import { listRecords } from "@/lib/airtable";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const offset = searchParams.get("offset") ?? undefined;

  const data = await listRecords(
    {
      view: "Grid view",
      pageSize: 100,
      offset,
      filterByFormula: "({Status} = 'Ontvangen')",
      sort: [{ field: "Aangemaakt op", direction: "asc" }], // 👈 here
      // optional: fields: ["Aanvraagnummer","Voorkeur","Herkomst","Aangemaakt op","Status"],
    },
    60
  );

  return NextResponse.json(data, { status: 200 });
}
