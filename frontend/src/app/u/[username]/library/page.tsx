import type { Metadata } from "next";
import PublicLibraryClient from "./PublicLibraryClient";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const title = `@${username}'s Library · Leaf`;
  const description = `Browse ${username}'s virtual bookshelf on Leaf — a collection of every book that tells their story.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "Leaf",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function PublicLibraryPage() {
  return <PublicLibraryClient />;
}
