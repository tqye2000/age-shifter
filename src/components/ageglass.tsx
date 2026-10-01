import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Download, Replace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { copy, explainShift, withAge, type Lang } from "@/lib/i18n";
import { shiftAge } from "@/lib/shift-age";

type Kept = { age: number; note: string; image: string };

const MAX_EDGE = 1024;
const MIN_AGE = 5;
const MAX_AGE = 80;
const DEFAULT_AGE = 7;

async function fileToJpegDataUrl(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("type");
  if (file.size > 25_000_000) throw new Error("size");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("read");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("read");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  } finally {
    bitmap.close();
  }
}

function downloadDataUrl(dataUrl: string, age: number) {
  const ext = dataUrl.startsWith("data:image/png") ? "png" : dataUrl.startsWith("data:image/webp") ? "webp" : "jpg";
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = `ageglass-${age}.${ext}`;
  anchor.click();
}

function Frame({
  label,
  detail,
  children,
}: {
  label: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="text-sm text-muted">{detail}</span>
      </figcaption>
      <div className="rounded-xl bg-mat p-2 shadow-border">
        <div className="portrait-well flex items-center justify-center overflow-hidden rounded-lg bg-mat">{children}</div>
      </div>
    </figure>
  );
}

export function Ageglass() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [source, setSource] = useState<string | null>(null);
  const [age, setAge] = useState(DEFAULT_AGE);
  const [cache, setCache] = useState<Kept[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState<{ code: string; detail?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const t = copy[lang];
  const error = fault
    ? fault.code === "type"
      ? t.errType
      : fault.code === "size"
        ? t.errSize
        : fault.code === "read"
          ? t.errRead
          : explainShift(fault.code, fault.detail, t)
    : null;
  const noteKey = note.trim();
  const result = cache.find((item) => item.age === age && item.note === noteKey)?.image ?? null;

  useEffect(() => {
    const saved = localStorage.getItem("ageglass-lang");
    const next: Lang = saved === "zh" ? "zh" : "en";
    setLang(next);
    document.documentElement.lang = next === "zh" ? "zh-Hans" : "en";
  }, []);

  useEffect(() => {
    if (!result && !busy) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [result, busy, age]);

  function pickLang(next: Lang) {
    setLang(next);
    localStorage.setItem("ageglass-lang", next);
    document.documentElement.lang = next === "zh" ? "zh-Hans" : "en";
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setFault(null);
    try {
      const dataUrl = await fileToJpegDataUrl(file);
      setSource(dataUrl);
      setCache([]);
    } catch (err) {
      setFault({ code: err instanceof Error ? err.message : "read" });
    }
  }

  async function onShift() {
    if (!source || busy) return;
    if (result) return;
    setBusy(true);
    setFault(null);
    try {
      const response = await shiftAge({ data: { image: source, age, note: noteKey } });
      if (!response.ok) {
        setFault({ code: response.code, detail: response.detail });
        return;
      }
      setCache((prev) =>
        [{ age: response.age, note: noteKey, image: response.image }, ...prev.filter((item) => item.age !== response.age || item.note !== noteKey)].slice(0, 4),
      );
    } catch {
      setFault({ code: "finish" });
    } finally {
      setBusy(false);
    }
  }

  const resultDetail = busy ? t.detailShifting : result ? "" : t.waiting;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-12 sm:pb-16">
      <header>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">{t.brand}</p>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-line/70 p-1" role="radiogroup" aria-label={t.langLabel}>
            {(
              [
                ["en", "English"],
                ["zh", "中文"],
              ] as const
            ).map(([id, label]) => {
              const selected = lang === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pickLang(id)}
                  className={cn(
                    "press h-11 rounded-md px-3 text-sm font-medium transition-[background-color,color] duration-150",
                    selected ? "bg-surface text-fg shadow-border" : "text-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <h1 className="mt-2 max-w-xl text-4xl leading-tight tracking-tight text-fg sm:text-5xl">{t.title}</h1>
        <p className="mt-4 max-w-xl text-base text-muted">{t.lede}</p>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:mt-10 lg:grid-cols-2 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <Frame label={t.original} detail={source ? t.yourPortrait : t.noPhoto}>
            {source ? (
              <img src={source} alt={t.altOriginal} className="h-full w-full object-contain" />
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  void loadFile(event.dataTransfer.files[0]);
                }}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-mat-fg",
                  dragOver && "bg-fg/10",
                )}
              >
                <span className="font-display text-2xl">{t.addPortrait}</span>
                <span className="max-w-56 text-sm text-mat-fg/70">{t.addHint}</span>
              </button>
            )}
          </Frame>

            <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-fg">{t.targetAge}</span>
                    <span className="font-display text-2xl tabular-nums text-fg">{age}</span>
                  </span>
                  <input
                    type="range"
                    className="age-range"
                    min={MIN_AGE}
                    max={MAX_AGE}
                    step={1}
                    value={age}
                    disabled={busy}
                    aria-valuetext={withAge(t.aboutAge, age)}
                    style={{ "--age-fill": `${((age - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100}%` } as CSSProperties}
                    onChange={(event) => {
                      setAge(Number(event.target.value));
                      setFault(null);
                    }}
                  />
                  <span className="flex justify-between text-sm text-subtle tabular-nums">
                    <span>{MIN_AGE}</span>
                    <span>{MAX_AGE}</span>
                  </span>
                </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-fg">{t.instructions}</span>
                <textarea
                  value={note}
                  maxLength={280}
                  rows={3}
                  disabled={busy}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setFault(null);
                  }}
                  placeholder={t.placeholder}
                  className="min-h-24 w-full resize-y rounded-md bg-surface px-3 py-3 text-sm text-fg shadow-border outline-none placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-45"
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="full" className="sm:flex-1" disabled={!source || busy || Boolean(result)} onClick={() => void onShift()}>
                  {busy ? t.shifting : result ? t.already : withAge(t.shiftTo, age)}
                </Button>
                {source ? (
                  <Button variant="surface" className="sm:w-auto" disabled={busy} onClick={() => inputRef.current?.click()}>
                    <Replace className="size-4" aria-hidden="true" />
                    {t.replace}
                  </Button>
                ) : null}
              </div>
            </div>
        </div>

        <div ref={resultRef}>
          <Frame label={withAge(t.aboutAge, age)} detail={resultDetail}>
          {result ? (
            <img src={result} alt={withAge(t.altShifted, age)} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-display text-2xl text-mat-fg">{busy ? t.moving : t.lands}</p>
              <p className="max-w-56 text-sm text-mat-fg/70">{busy ? t.busyHint : t.idleHint}</p>
              {busy ? <div className="age-sweep mt-2 h-px w-24 bg-mat-fg/30" aria-hidden="true" /> : null}
            </div>
          )}
          </Frame>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3" aria-live="polite">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {result ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="surface" onClick={() => downloadDataUrl(result, age)}>
              <Download className="size-4" aria-hidden="true" />
              {t.download}
            </Button>
            <p className="text-sm text-muted">{t.kept}</p>
          </div>
        ) : null}
        <p className="max-w-prose text-sm text-subtle">{t.disclaimer}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void loadFile(file);
        }}
      />
    </main>
  );
}
