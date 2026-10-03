"use client";
import { useCallback, useEffect, useState } from "react";
import PassportView from "@/components/PassportView";
import Splash from "@/components/Splash";
import { getUserId } from "@/lib/clientUser";
import type { Passport } from "@/lib/passport";

export default function Home() {
  const [userId, setUserId] = useState("");
  const [pass, setPass] = useState<Passport | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (id: string) => {
    const r = await fetch(`/api/passport?userId=${encodeURIComponent(id)}&tz=${new Date().getTimezoneOffset()}`);
    if (r.ok) setPass(await r.json());
    setLoaded(true); // also on failure: never leave the splash up
  }, []);

  useEffect(() => {
    const init = async () => { const id = getUserId(); setUserId(id); await load(id); };
    init();
  }, [load]);

  // A signed-in wallet's passport is addressed by the wallet; the API resolves it from the session cookie.
  return (
    <>
      <Splash ready={loaded} />
      <PassportView pass={pass} passportId={pass?.wallet ?? userId} owner onAccountChange={() => { if (userId) load(userId); }} />
    </>
  );
}
