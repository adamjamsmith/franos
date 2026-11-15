"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ACCEPT } from "@/media/types";

type MediaFile = { id: string; name: string; kind: "image" | "video" | "document"; size: string; path: string };
type Props = { slug: string; canChange: boolean; files: MediaFile[]; remove: (form: FormData) => Promise<void> };

const line = "border-neutral-300 dark:border-neutral-700";
const small = "text-[11px] leading-tight text-neutral-500 dark:text-neutral-400";
const columns = "grid grid-cols-[2.5rem_minmax(0,1fr)_4rem_4.5rem_6.5rem_2.5rem] items-center gap-x-3 px-3";
const kindNames = { image: "Picture", video: "Video", document: "PDF" };

/** Sends one file to franOS, reporting how far it has got. Resolves with an error message, or null if it worked. */
function upload(slug: string, file: File, onProgress: (percent: number) => void): Promise<string | null> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/b/${slug}/settings/media/upload`);
    request.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    request.onload = () => {
      if (request.status === 200) return resolve(null);
      try {
        resolve(JSON.parse(request.responseText).error ?? `${file.name} could not be added.`);
      } catch {
        resolve(`${file.name} could not be added.`);
      }
    };
    request.onerror = () => resolve(`${file.name} could not be added. Check the connection and try again.`);
    request.send(file);
  });
}

/**
 * The brand's files as one tight table. The top row adds files; each file has its address to copy
 * into whichever settings box needs it, and a cross to remove it.
 */
export function MediaManager({ slug, canChange, files, remove }: Props) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [copied, setCopied] = useState("");

  const add = async (chosen: FileList | null) => {
    if (!chosen || chosen.length === 0) return;
    const list = [...chosen];
    const failed: string[] = [];
    for (const [index, file] of list.entries()) {
      const label = list.length > 1 ? `${file.name} (${index + 1} of ${list.length})` : file.name;
      setBusy(`Adding ${label}...`);
      const error = await upload(slug, file, (percent) => setBusy(`Adding ${label}... ${percent}%`));
      // Say which file it was, when the message does not already.
      if (error) failed.push(error.includes(file.name) ? error : `${file.name}: ${error}`);
    }
    setBusy("");
    setProblems(failed);
    if (picker.current) picker.current.value = "";
    router.refresh();
  };

  const copy = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.path);
      setCopied(file.id);
      setTimeout(() => setCopied((current) => (current === file.id ? "" : current)), 1500);
    } catch {
      window.prompt("Copy this address", file.path);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <h2 className="text-lg font-semibold">Media</h2>
      {problems.map((text) => (
        <p key={text} role="alert" className="rounded-md bg-red-500/15 px-3 py-2 text-sm">
          {text}
        </p>
      ))}

      <div className={`overflow-hidden rounded-md border text-sm ${line}`}>
        {canChange && (
          <label
            className={`flex cursor-pointer items-center border-b bg-neutral-100 pl-3 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 ${line} ${busy ? "pointer-events-none" : ""}`}
          >
            <span className={`flex-1 py-2 ${busy ? "" : "text-neutral-400"}`}>{busy || "Add pictures, videos or PDFs..."}</span>
            <span className={`self-stretch border-l px-3 py-2 text-neutral-500 ${line}`}>+</span>
            <input ref={picker} type="file" multiple accept={ACCEPT} disabled={Boolean(busy)} onChange={(event) => add(event.target.files)} className="sr-only" />
          </label>
        )}
        {files.length === 0 && <p className={`${small} px-3 py-2`}>No files yet.</p>}
        {files.map((file) => (
          <div key={file.id} className={`${columns} border-t py-1.5 first:border-t-0 ${line}`}>
            <a href={file.path} target="_blank" className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-neutral-200 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {file.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.path} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : file.kind === "video" ? (
                "▶"
              ) : (
                "PDF"
              )}
            </a>
            <a href={file.path} target="_blank" className="truncate underline-offset-2 hover:underline" title={file.name}>
              {file.name}
            </a>
            <span className="text-neutral-600 dark:text-neutral-300">{kindNames[file.kind]}</span>
            <span className="tabular-nums text-neutral-600 dark:text-neutral-300">{file.size}</span>
            <button onClick={() => copy(file)} title={file.path} className="whitespace-nowrap text-left text-xs text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100">
              {copied === file.id ? "Copied" : "Copy address"}
            </button>
            {canChange ? (
              <form
                action={remove}
                onSubmit={(event) => {
                  if (!window.confirm(`Remove ${file.name}? Anything using it will show nothing.`)) event.preventDefault();
                }}
              >
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="id" value={file.id} />
                <button aria-label={`Remove ${file.name}`} className="flex h-8 w-8 items-center justify-center text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                  ✕
                </button>
              </form>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
