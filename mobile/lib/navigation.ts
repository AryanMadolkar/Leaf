import type { Href } from "expo-router";

/** Typed href helpers so dynamic routes don't need `as any`. */
export function bookHref(id: string): Href {
  return { pathname: "/book/[id]", params: { id } };
}

export function profileHref(username: string): Href {
  return { pathname: "/profile/[username]", params: { username } };
}

export function paramString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
