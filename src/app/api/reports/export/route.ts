import { database } from "@/lib/db";
import { csvRow, parseReport, reportColumns, reportSource } from "@/lib/reports";
import { currentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await currentUser(request.headers);
  if (!user) return new Response("Sign in to export a report.", { status: 401, headers: { "Cache-Control": "no-store" } });
  const query = parseReport(Object.fromEntries(new URL(request.url).searchParams));
  const source = reportSource(database(), query);
  const batchSize = 500;
  const first = await source.rows(0, batchSize);
  async function* lines() {
    yield csvRow(reportColumns(query));
    let batch = first;
    for (let skip = batchSize; ; skip += batchSize) {
      for (const row of batch) yield csvRow(row);
      if (batch.length < batchSize) break;
      batch = await source.rows(skip, batchSize);
    }
  }
  const iterator = lines();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async pull(controller) {
      const line = await iterator.next();
      if (line.done) controller.close();
      else controller.enqueue(encoder.encode(line.value));
    },
    async cancel() { await iterator.return(undefined); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="openasset-' + query.report + '.csv"',
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
