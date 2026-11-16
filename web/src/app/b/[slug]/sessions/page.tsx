import { redirect } from "next/navigation";
import { withSession } from "@/db/context";
import { requireBrand } from "@/lib/session";
import { listSessions } from "@/sessions/sessions";
import { SessionsView } from "../calls/sessions-view";

/**
 * Recorded sessions with people who are not leads: testimonials, franchisor interviews, other recordings and
 * working meetings. The owner's alone: anyone else is sent back to the board.
 */
export default async function SessionsPage({ params, searchParams }: PageProps<"/b/[slug]/sessions">) {
  const { slug } = await params;
  const query = await searchParams;
  const { session, db, role, client } = await requireBrand(slug);
  if (role !== "owner") redirect(`/b/${slug}/board`);
  const sessions = await withSession(db, session, (tx) => listSessions(tx));
  const one = (value: unknown) => (typeof value === "string" ? value : undefined);
  return <SessionsView brand={client} sessions={sessions} now={new Date()} problem={one(query.problem)} done={one(query.done)} />;
}
