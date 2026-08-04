import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { Book } from "@/lib/types";
import BookCover from "@/components/BookCover";
import LogBookModal from "@/components/LogBookModal";
import { colors, fonts } from "@/constants/theme";

type UserResult = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  isFollowing: boolean;
};

type Tab = "books" | "readers";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("books");
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [logBook, setLogBook] = useState<Book | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setBooks([]);
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const [booksRes, usersRes] = await Promise.all([
        authFetch(`/api/books/search?q=${encodeURIComponent(q)}`),
        authFetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=20`),
      ]);
      const booksData = await booksRes.json();
      const usersData = await usersRes.json();
      setBooks(booksData.success ? booksData.books : []);
      setUsers(usersData.success ? usersData.users : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeQuery = (text: string) => {
    setQuery(text);
    runSearch(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search books or readers..."
          value={query}
          onChangeText={onChangeQuery}
          autoFocus
        />
      </View>

      <View style={styles.tabs}>
        <TabButton label={`Books (${books.length})`} active={tab === "books"} onPress={() => setTab("books")} />
        <TabButton label={`Readers (${users.length})`} active={tab === "readers"} onPress={() => setTab("readers")} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : tab === "books" ? (
        <View style={styles.grid}>
          {books.map((book) => (
            <View key={book.id} style={styles.bookCell}>
              <View>
                <BookCover
                  uri={book.coverImage}
                  title={book.title}
                  width={100}
                  height={148}
                  onPress={() => router.push(`/book/${book.id}` as any)}
                />
                <Pressable style={styles.logButton} onPress={() => setLogBook(book)}>
                  <Ionicons name="add" size={14} color={colors.white} />
                </Pressable>
              </View>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {book.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {book.author}
              </Text>
            </View>
          ))}
          {!loading && query.length >= 2 && books.length === 0 && (
            <Text style={styles.emptyText}>No books found.</Text>
          )}
        </View>
      ) : (
        <View style={{ gap: 10, paddingHorizontal: 16 }}>
          {users.map((u) => {
            const avatar = resolveMediaUrl(u.avatar);
            return (
              <Pressable
                key={u.id}
                style={styles.userRow}
                onPress={() => router.push(`/profile/${u.username}` as any)}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {u.name}
                  </Text>
                  <Text style={styles.userHandle} numberOfLines={1}>
                    @{u.username}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {!loading && query.length >= 2 && users.length === 0 && (
            <Text style={styles.emptyText}>No readers found.</Text>
          )}
        </View>
      )}

      {logBook && (
        <LogBookModal
          visible
          bookId={logBook.id}
          bookTitle={logBook.title}
          onClose={() => setLogBook(null)}
        />
      )}
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  searchBar: { padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.sans,
    backgroundColor: colors.creamCard,
  },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  tabButtonActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabButtonText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  tabButtonTextActive: { color: colors.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 },
  logButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.cream,
  },
  bookCell: { width: 100, gap: 4 },
  bookTitle: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.charcoal },
  bookAuthor: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
  emptyText: { fontSize: 12, color: colors.charcoalMuted, fontStyle: "italic", marginTop: 12, fontFamily: fonts.sans },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    padding: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.creamDark },
  avatarFallback: {},
  userName: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.charcoal },
  userHandle: { fontSize: 11, color: colors.charcoalMuted, fontFamily: fonts.sans },
});
