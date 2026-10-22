"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Store } from "lucide-react";
import AccountChip from "@/components/AccountChip";
import type { MyPlace } from "@/components/ShopTools";
import { currentAccount } from "@/lib/account";
import { useAccountChange, useDesktop } from "@/lib/desktop";
import { kindOf } from "@/lib/placeKinds";

/** "My shop": the places the signed-in person runs, as owner or staff. Their home at "/" and the /shop page. */
export default function MyShops() {
  const [places, setPlaces] = useState<MyPlace[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const desktop = useDesktop();
  const load = useCallback(async () => {
    const a = await currentAccount().catch(() => null);
    setSignedIn(!!a?.signedIn);
    if (!a?.signedIn) { setPlaces([]); return; }
    const r = await fetch("/api/places/mine", { cache: "no-store" });
    setPlaces(r.ok ? (await r.json()).places : []);
  }, []);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);
  useAccountChange(load);

  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] leading-tight lg:text-[30px]">My shop</h1>
        {!desktop && <AccountChip onChange={load} />}
      </div>
      {places === null ? <Loader2 size={24} className="mx-auto animate-spin text-sage-700" /> : !signedIn ? (
        <p className="glass rounded-[22px] p-4 text-sm">Sign in to see the places you run. New here? <Link href="/join" className="font-bold underline">Set up your place</Link>.</p>
      ) : (
        <>
          {places.length === 0 && <p className="glass rounded-[22px] p-4 text-sm">You don&apos;t run a place on EcoProof yet. Set one up, or ask its owner for an invite link.</p>}
          <ul className="space-y-3">
            {places.map((p) => (
              <li key={p.id}>
                <Link href={`/shop/${p.id}`} className="glass lift flex items-center gap-3 rounded-[22px] p-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt="" width={52} height={52} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-[17px] leading-tight">{p.name}</span>
                    <span className="block text-xs text-sage-900">{kindOf(p.kind)?.label ?? p.kind} · {p.role === "staff" ? "Staff" : "Owner"}{p.status && p.status !== "active" ? " · paused" : ""}</span>
                  </span>
                  <span className="text-sm font-bold text-sage-700">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/join" className="glass lift flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold"><Plus size={16} strokeWidth={2.5} /> Set up a new place</Link>
        </>
      )}
      <p className="flex items-center gap-1.5 text-xs text-sage-900"><Store size={13} /> Staff see customer activity and can show the QR code and print cards. Only owners change settings.</p>
    </div>
  );
}
