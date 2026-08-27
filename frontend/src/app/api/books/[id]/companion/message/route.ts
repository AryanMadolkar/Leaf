import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureBookRow, getBookById } from "@/utils/booksApi";
import { GeminiError, generateGeminiText } from "@/utils/gemini";

type RouteContext = { params: Promise<{ id: string }> };

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
};

const SPOILER_REFUSAL =
  "I can’t answer that yet — it would spoil pages ahead of where you are. Ask again when you’ve read further, or rephrase about what you’ve already covered.";

function looksLikeSpoilerProbe(text: string): boolean {
  return /how does it end|ending|who dies|what happens at the end|spoil(er|s)?|final chapter|does .+ (die|survive|kiss)|twist at the end/i.test(
    text
  );
}

function buildSystemPrompt(opts: {
  title: string;
  author: string;
  description?: string;
  genres?: string[];
  page: number | null;
  chapter: string | null;
  passage?: string;
}): string {
  const position =
    opts.page != null
      ? `The reader is currently around page ${opts.page}${opts.chapter ? ` (chapter: ${opts.chapter})` : ""}.`
      : opts.chapter
        ? `The reader is around chapter: ${opts.chapter}.`
        : "Reading position is unknown — stay conservative and avoid late-plot spoilers.";

  return `You are Ask Leaf, a calm reading companion for the book tracker Leaf.
Tone: warm, concise, editorial — cream-and-charcoal, never neon or hype.

Book: "${opts.title}" by ${opts.author}
Genres: ${(opts.genres || []).join(", ") || "unknown"}
Publisher/catalog description (may contain mild spoilers — treat carefully):
${(opts.description || "No description available.").slice(0, 1200)}

${position}

Rules:
1) SPOILER LOCK: Do not reveal plot events, character fates, twists, or revelations that typically occur after the reader's stated position. If unsure whether something is ahead, refuse gently.
2) Soft refusal when asked for future spoilers: "${SPOILER_REFUSAL}"
3) Base answers on metadata (title/author/description/genres), the reader's position, and any passage they paste. Do NOT invent plot points, quotes, or scenes as if you have the full text.
4) If they paste a passage, you may discuss that passage freely.
5) Keep answers under ~180 words unless they ask for more.
6) You may help with themes, pacing expectations, similar books, or clarifying confusing early setup — without spoiling later pages.

${
  opts.passage
    ? `User-pasted passage (trusted for this turn):\n"""${opts.passage.slice(0, 2500)}"""`
    : "No passage pasted."
}`;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookParam } = await context.params;
    const book = await getBookById(bookParam);
    if (!book) {
      return NextResponse.json({ success: false, error: "Book not found" }, { status: 404 });
    }
    const bookId = await ensureBookRow(book);

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
    }

    const page = body.page != null ? Number(body.page) : null;
    const chapter = typeof body.chapter === "string" ? body.chapter.trim() : null;
    const passage = typeof body.passage === "string" ? body.passage.trim() : "";
    let conversationId = typeof body.conversationId === "string" ? body.conversationId : null;

    const db = createAdminClient();

    // Prefer page from user_books if client omitted
    let resolvedPage = page;
    let resolvedChapter = chapter;
    if (resolvedPage == null || !resolvedChapter) {
      const { data: ub } = await db
        .from("user_books")
        .select("current_page, current_chapter")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .maybeSingle();
      if (resolvedPage == null) resolvedPage = ub?.current_page ?? null;
      if (!resolvedChapter) resolvedChapter = ub?.current_chapter ?? null;
    }

    let messages: ChatMessage[] = [];
    if (conversationId) {
      const { data: existing } = await db
        .from("ai_conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        messages = Array.isArray(existing.messages) ? existing.messages : [];
      } else {
        conversationId = null;
      }
    }

    if (!conversationId) {
      const { data: created, error: createErr } = await db
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          book_id: bookId,
          reading_position: { page: resolvedPage, chapter: resolvedChapter },
          messages: [],
        })
        .select()
        .single();
      if (createErr) throw createErr;
      conversationId = created.id;
      messages = [];
    }

    const now = new Date().toISOString();
    const userMsg: ChatMessage = { role: "user", content, at: now };
    messages = [...messages, userMsg].slice(-24);

    let assistantText: string;
    const earlyPosition = resolvedPage != null && resolvedPage < 40;

    if (earlyPosition && looksLikeSpoilerProbe(content) && !passage) {
      assistantText = SPOILER_REFUSAL;
    } else {
      const system = buildSystemPrompt({
        title: book.title,
        author: book.author,
        description: book.description,
        genres: book.genres,
        page: resolvedPage,
        chapter: resolvedChapter,
        passage: passage || undefined,
      });

      const history = messages
        .slice(-10)
        .map((m) => `${m.role === "user" ? "Reader" : "Ask Leaf"}: ${m.content}`)
        .join("\n\n");

      try {
        assistantText = await generateGeminiText({
          system,
          prompt: history,
          temperature: 0.35,
          maxOutputTokens: 500,
        });
      } catch (err) {
        if (err instanceof GeminiError) {
          return NextResponse.json(
            { success: false, error: err.message },
            { status: err.status }
          );
        }
        throw err;
      }
    }

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: assistantText,
      at: new Date().toISOString(),
    };
    messages = [...messages, assistantMsg];

    const { error: updateErr } = await db
      .from("ai_conversations")
      .update({
        messages,
        reading_position: { page: resolvedPage, chapter: resolvedChapter },
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      conversationId,
      message: assistantMsg,
      readingPosition: { page: resolvedPage, chapter: resolvedChapter },
    });
  } catch (err: any) {
    console.error("[companion/message]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Ask Leaf failed" },
      { status: 500 }
    );
  }
}
