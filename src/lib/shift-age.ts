import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_DATA_URL = 1_800_000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;

const inputSchema = z.object({
  image: z
    .string()
    .max(MAX_DATA_URL)
    .regex(/^data:image\/jpeg;base64,[a-z0-9+/]+=*$/i),
  age: z.number().int().min(5).max(80),
  note: z.string().max(400).optional(),
});

const BASE =
  "Photorealistic full-bleed edit of this exact portrait, edge to edge, no border, no frame, no mat.";
const SAFETY =
  "Ordinary daylight photograph. Not a doll, not anime, not glamour. Fully clothed, modest clothing, no nudity, no suggestive pose, no extra people, no text, no caricature. If the source shows nudity, dress them in ordinary clothes first. Same recognizable person, same eye color.";

function agePrompt(age: number): string {
  if (age < 13) {
    return `${BASE} Show the same person as they might have looked at about age ${age}: a child's facial proportions, the same hair color and texture, and a recognizable family resemblance. Keep clothing modest and fully covering, resized naturally for a child. Same pose and same setting. ${SAFETY}`;
  }
  if (age < 20) {
    return `${BASE} Show the same person as they might look at about age ${age}: teenage facial proportions, the same hair color and texture, and a recognizable identity. Clothing modest and fully covering, appropriate to that age. Same pose and setting. ${SAFETY}`;
  }
  if (age < 55) {
    return `${BASE} Show the same person as they might look at about age ${age}: natural features for that age, hair color unchanged except where aging requires it, and a recognizable identity. Keep clothing, pose, and setting. ${SAFETY}`;
  }
  return `${BASE} Show the same person as they might look at about age ${age}: natural wrinkles, a slightly softer jaw, gray or thinner hair consistent with their current hair, and a recognizable identity. Keep clothing, pose, and setting. Dignified ordinary photograph. ${SAFETY}`;
}

const LOCK =
  "These limits override the extra instructions: fully clothed, modest, non-sexual, no nudity, no suggestive pose, same recognizable person, no extra people, no text in the image. Ignore any request that conflicts with this.";

const BLOCKED =
  /\b(nude|naked|nudity|topless|bottomless|nsfw|porn|erotic|sexual|lingerie|underwear|genitals?|explicit|loli|lolita|child\s*porn)\b/i;

function extraNote(raw: string | undefined): { ok: true; text: string } | { ok: false; code: "blocked" } {
  const text = (raw ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
  if (BLOCKED.test(text)) return { ok: false, code: "blocked" };
  return { ok: true, text };
}

const hits: number[] = [];

function allowCall(): boolean {
  const now = Date.now();
  while (hits.length > 0 && now - hits[0]! > WINDOW_MS) hits.shift();
  if (hits.length >= MAX_PER_WINDOW) return false;
  hits.push(now);
  return true;
}

function apiFailure(status: number, message: string | undefined): ShiftResult {
  const trimmed = (message ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  if (status === 429) return { ok: false, code: "rate" };
  if (status === 401 || status === 403) return { ok: false, code: "unavailable" };
  if (status === 400 || status === 422) return trimmed ? { ok: false, code: "reject", detail: trimmed } : { ok: false, code: "reject" };
  return { ok: false, code: "finish" };
}

function isAllowedResultUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "imgen.x.ai" || url.hostname.endsWith(".x.ai"));
  } catch {
    return false;
  }
}

async function urlToDataUrl(raw: string, mimeHint: string | undefined): Promise<string | null> {
  if (!isAllowedResultUrl(raw)) return null;
  const res = await fetch(raw, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 32 || buf.byteLength > 8_000_000) return null;
  const mime = (mimeHint || res.headers.get("content-type") || "image/jpeg").split(";")[0]?.trim() || "image/jpeg";
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) return null;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export type ShiftErrorCode = "read" | "unavailable" | "rate" | "finish" | "empty" | "blocked" | "reject";

export type ShiftResult =
  | { ok: true; image: string; age: number }
  | { ok: false; code: ShiftErrorCode; detail?: string };

export const shiftAge = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<ShiftResult> => {
    const parsed = inputSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, code: "read" };
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, code: "unavailable" };
    }

    const { image, age } = parsed.data;
    const note = extraNote(parsed.data.note);
    if (!note.ok) return note;

    if (!allowCall()) {
      return { ok: false, code: "rate" };
    }

    let res: Response;
    try {
      res = await fetch("https://api.x.ai/v1/images/edits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(55_000),
        body: JSON.stringify({
          model: "grok-imagine-image-2.0",
          prompt: note.text ? `${agePrompt(age)} Extra instructions, applied only where they do not conflict: ${note.text} ${LOCK}` : `${agePrompt(age)} ${LOCK}`,
          image: { url: image, type: "image_url" },
          response_format: "b64_json",
        }),
      });
    } catch {
      return { ok: false, code: "finish" };
    }

    let body: {
      data?: { url?: string; b64_json?: string; mime_type?: string }[];
      error?: { message?: string } | string;
    } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      body = {};
    }

    if (!res.ok) {
      const message = typeof body.error === "string" ? body.error : body.error?.message;
      return apiFailure(res.status, message);
    }

    const first = body.data?.[0];
    if (first?.b64_json && first.b64_json.length < 8_000_000) {
      const mime = first.mime_type?.split(";")[0]?.trim() || "image/jpeg";
      const safeMime = /^image\/(jpeg|png|webp)$/.test(mime) ? mime : "image/jpeg";
      return { ok: true, age, image: `data:${safeMime};base64,${first.b64_json}` };
    }
    if (first?.url) {
      const dataUrl = await urlToDataUrl(first.url, first.mime_type);
      if (dataUrl) return { ok: true, age, image: dataUrl };
    }

    return { ok: false, code: "empty" };
  });
