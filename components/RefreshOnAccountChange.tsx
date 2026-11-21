"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAccountChange } from "@/lib/desktop";

/** "/" reads the session on the server (its navigation says "My shop" to someone who runs a place): after a sign-in or sign-out, fetch it again. */
export default function RefreshOnAccountChange() {
  const router = useRouter();
  useAccountChange(useCallback(() => router.refresh(), [router]));
  return null;
}
