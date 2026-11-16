import { notFound, redirect } from "next/navigation";
import { appDb } from "@/db";
import { brandOfLead } from "@/email/lookup";
import { signatureOk } from "@/email/render";
import { unsubscribe } from "@/email/send";
import { siteSession } from "@/site/leads";

async function confirm(form: FormData) {
  "use server";
  const id = String(form.get("id") ?? "");
  const signature = String(form.get("s") ?? "");
  const brand = await brandOfLead(id);
  if (!brand || !(await unsubscribe(await appDb(), siteSession(brand.id), id, signature))) notFound();
  redirect(`/u/${id}?s=${signature}&done=1`);
}

/**
 * The unsubscribe link at the bottom of every email.
 * It asks for one press of a button, because some mail systems open every link in an email
 * automatically and would otherwise unsubscribe people by accident.
 */
export default async function UnsubscribePage({ params, searchParams }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const signature = typeof query.s === "string" ? query.s : "";
  const brand = await brandOfLead(id);
  if (!brand || !signatureOk(`unsubscribe|${id}`, signature)) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 bg-white px-4 py-12 text-neutral-900">
      {query.done ? (
        <>
          <h1 className="text-2xl font-semibold">You are unsubscribed</h1>
          <p>You will not get any more emails from {brand.name}, apart from the details of a call you have booked.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Unsubscribe from {brand.name} emails?</h1>
          <form action={confirm}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="s" value={signature} />
            <button className="rounded-md bg-neutral-900 px-5 py-3 font-semibold text-white hover:bg-neutral-700">
              Yes, unsubscribe me
            </button>
          </form>
        </>
      )}
    </main>
  );
}
