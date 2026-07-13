import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureBookRow, getBookById } from "@/utils/booksApi";
import { fetchLibraryPayload, slugify } from "@/utils/library";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const { user } = await getRequestUser();
    const admin = createAdminClient();

    let targetUserId = user?.id || null;

    if (username) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, username")
        .ilike("username", username)
        .maybeSingle();
      if (!profile) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }
      targetUserId = profile.id;

      const { data: settings } = await admin
        .from("library_settings")
        .select("privacy")
        .eq("user_id", profile.id)
        .maybeSingle();

      const privacy = settings?.privacy || "public";
      const isOwner = user?.id === profile.id;
      if (!isOwner && privacy === "private") {
        return NextResponse.json({ success: false, error: "This library is private." }, { status: 403 });
      }
      // friends privacy: treat as public for now (no friends graph gating yet)
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const library = await fetchLibraryPayload(targetUserId);
    return NextResponse.json({ success: true, library, userId: targetUserId });
  } catch (error: any) {
    console.error("[library GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as string;
    const admin = createAdminClient();

    if (action === "create_shelf") {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json({ success: false, error: "Shelf name required" }, { status: 400 });
      }
      const { data: existing } = await admin
        .from("library_shelves")
        .select("position")
        .eq("user_id", user.id)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;
      let slug = slugify(name);
      const { data: clash } = await admin
        .from("library_shelves")
        .select("id")
        .eq("user_id", user.id)
        .eq("slug", slug)
        .maybeSingle();
      if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

      const { data: shelf, error } = await admin
        .from("library_shelves")
        .insert({
          user_id: user.id,
          name,
          slug,
          note: String(body.note || ""),
          position: nextPos,
          is_favorites: false,
          is_system: false,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, shelf, library });
    }

    if (action === "add_book") {
      const bookId = String(body.bookId || "");
      const shelfId = body.shelfId as string | undefined;
      if (!bookId) {
        return NextResponse.json({ success: false, error: "bookId required" }, { status: 400 });
      }

      const book = await getBookById(bookId);
      if (!book) {
        return NextResponse.json({ success: false, error: "Book not found" }, { status: 404 });
      }
      const resolvedId = await ensureBookRow(book);

      // Ensure on user_books as want_to_read if missing
      const { data: ub } = await admin
        .from("user_books")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_id", resolvedId)
        .maybeSingle();
      if (!ub) {
        await admin.from("user_books").insert({
          user_id: user.id,
          book_id: resolvedId,
          status: "want_to_read",
          current_page: 0,
        });
      }

      let targetShelfId = shelfId;
      if (!targetShelfId) {
        const { data: want } = await admin
          .from("library_shelves")
          .select("id")
          .eq("user_id", user.id)
          .eq("system_key", "want_to_read")
          .maybeSingle();
        targetShelfId = want?.id;
      }
      if (!targetShelfId) {
        return NextResponse.json({ success: false, error: "No shelf available" }, { status: 400 });
      }

      const { data: shelfMeta } = await admin
        .from("library_shelves")
        .select("is_favorites")
        .eq("id", targetShelfId)
        .maybeSingle();

      if (shelfMeta?.is_favorites) {
        const { count } = await admin
          .from("library_shelf_books")
          .select("id", { count: "exact", head: true })
          .eq("shelf_id", targetShelfId);
        if ((count || 0) >= 10) {
          return NextResponse.json(
            { success: false, error: "Favorites holds at most 10 books." },
            { status: 400 },
          );
        }
      }

      const { data: last } = await admin
        .from("library_shelf_books")
        .select("position")
        .eq("shelf_id", targetShelfId)
        .order("position", { ascending: false })
        .limit(1);
      const pos = (last?.[0]?.position ?? -1) + 1;

      await admin.from("library_shelf_books").upsert(
        { shelf_id: targetShelfId, book_id: resolvedId, position: pos },
        { onConflict: "shelf_id,book_id" },
      );

      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, library, bookId: resolvedId });
    }

    if (action === "update_settings") {
      const { data: existing } = await admin
        .from("library_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const patchRow: Record<string, unknown> = {
        user_id: user.id,
        theme: body.theme || existing?.theme || "walnut",
        privacy: body.privacy || existing?.privacy || "public",
        view_mode: body.viewMode || existing?.view_mode || "bookshelf",
        updated_at: new Date().toISOString(),
      };

      await admin.from("library_settings").upsert(patchRow);
      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, library });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[library POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as string;
    const admin = createAdminClient();

    if (action === "rename_shelf") {
      const { shelfId, name, note } = body;
      const updates: Record<string, unknown> = {};
      if (typeof name === "string" && name.trim()) updates.name = name.trim();
      if (typeof note === "string") updates.note = note;
      const { error } = await admin
        .from("library_shelves")
        .update(updates)
        .eq("id", shelfId)
        .eq("user_id", user.id);
      if (error) throw error;
      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, library });
    }

    if (action === "reorder_shelves") {
      const order = body.order as string[];
      if (!Array.isArray(order)) {
        return NextResponse.json({ success: false, error: "order required" }, { status: 400 });
      }
      await Promise.all(
        order.map((id, position) =>
          admin.from("library_shelves").update({ position }).eq("id", id).eq("user_id", user.id),
        ),
      );
      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, library });
    }

    if (action === "move_book") {
      const { bookId, fromShelfId, toShelfId, toIndex } = body;
      if (!bookId || !toShelfId) {
        return NextResponse.json({ success: false, error: "bookId and toShelfId required" }, { status: 400 });
      }

      const { data: toShelf } = await admin
        .from("library_shelves")
        .select("id, is_favorites, user_id")
        .eq("id", toShelfId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!toShelf) {
        return NextResponse.json({ success: false, error: "Shelf not found" }, { status: 404 });
      }

      if (toShelf.is_favorites) {
        const { count } = await admin
          .from("library_shelf_books")
          .select("id", { count: "exact", head: true })
          .eq("shelf_id", toShelfId);
        const { data: already } = await admin
          .from("library_shelf_books")
          .select("id")
          .eq("shelf_id", toShelfId)
          .eq("book_id", bookId)
          .maybeSingle();
        if (!already && (count || 0) >= 10) {
          return NextResponse.json(
            { success: false, error: "Favorites holds at most 10 books." },
            { status: 400 },
          );
        }
      }

      if (fromShelfId && fromShelfId !== toShelfId) {
        await admin
          .from("library_shelf_books")
          .delete()
          .eq("shelf_id", fromShelfId)
          .eq("book_id", bookId);
      }

      const { data: existingOnTarget } = await admin
        .from("library_shelf_books")
        .select("id")
        .eq("shelf_id", toShelfId)
        .eq("book_id", bookId)
        .maybeSingle();

      if (existingOnTarget) {
        await admin
          .from("library_shelf_books")
          .update({ position: toIndex ?? 0 })
          .eq("id", existingOnTarget.id);
      } else {
        await admin.from("library_shelf_books").insert({
          shelf_id: toShelfId,
          book_id: bookId,
          position: toIndex ?? 0,
        });
      }

      // Normalize positions on target shelf
      const { data: targetBooks } = await admin
        .from("library_shelf_books")
        .select("id, book_id, position")
        .eq("shelf_id", toShelfId)
        .order("position", { ascending: true });

      if (targetBooks) {
        const ordered = [...targetBooks];
        const idx = ordered.findIndex((b) => b.book_id === bookId);
        if (idx >= 0 && typeof toIndex === "number") {
          const [item] = ordered.splice(idx, 1);
          ordered.splice(Math.min(toIndex, ordered.length), 0, item);
        }
        await Promise.all(
          ordered.map((b, i) =>
            admin.from("library_shelf_books").update({ position: i }).eq("id", b.id),
          ),
        );
      }

      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, library });
    }

    if (action === "remove_book") {
      const { bookId, shelfId, removeFromLibrary } = body;
      if (shelfId && bookId) {
        await admin
          .from("library_shelf_books")
          .delete()
          .eq("shelf_id", shelfId)
          .eq("book_id", bookId);
      }
      if (removeFromLibrary && bookId) {
        await admin.from("user_books").delete().eq("user_id", user.id).eq("book_id", bookId);
        const { data: allShelves } = await admin
          .from("library_shelves")
          .select("id")
          .eq("user_id", user.id);
        const ids = (allShelves || []).map((s: any) => s.id);
        if (ids.length) {
          await admin.from("library_shelf_books").delete().in("shelf_id", ids).eq("book_id", bookId);
        }
      }
      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, library });
    }

    if (action === "reorder_books") {
      const { shelfId, bookIds } = body as { shelfId: string; bookIds: string[] };
      if (!shelfId || !Array.isArray(bookIds)) {
        return NextResponse.json({ success: false, error: "shelfId and bookIds required" }, { status: 400 });
      }
      const { data: shelf } = await admin
        .from("library_shelves")
        .select("id")
        .eq("id", shelfId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!shelf) {
        return NextResponse.json({ success: false, error: "Shelf not found" }, { status: 404 });
      }
      await Promise.all(
        bookIds.map((bookId, position) =>
          admin
            .from("library_shelf_books")
            .update({ position })
            .eq("shelf_id", shelfId)
            .eq("book_id", bookId),
        ),
      );
      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, library });
    }

    if (action === "delete_shelf") {
      const { shelfId } = body;
      const { data: shelf } = await admin
        .from("library_shelves")
        .select("is_system, is_favorites")
        .eq("id", shelfId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!shelf) {
        return NextResponse.json({ success: false, error: "Shelf not found" }, { status: 404 });
      }
      if (shelf.is_system || shelf.is_favorites) {
        return NextResponse.json(
          { success: false, error: "System shelves cannot be deleted." },
          { status: 400 },
        );
      }
      await admin.from("library_shelves").delete().eq("id", shelfId);
      const library = await fetchLibraryPayload(user.id);
      return NextResponse.json({ success: true, library });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[library PATCH]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
