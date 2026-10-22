"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAccountChange } from "@/lib/desktop";

/** "/" is rendered on the server from the session: after a sign-in or sign-out, fetch it again so the right home appears. */
export default function RefreshOnAccountChange() {
  const router = useRouter();
  useAccountChange(useCallback(() => router.refresh(), [router]));
  return null;
}
