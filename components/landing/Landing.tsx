import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Cpu, Hash, Link2, Plug, Receipt, Share2, Stamp, X } from "lucide-react";
import HeroArt from "@/components/landing/HeroArt";
import IslandHero from "@/components/landing/IslandHero";
import LandingNav from "@/components/landing/LandingNav";
import { JournalWordmark, SECTIONS } from "@/components/landing/shared";
import { journalFonts } from "@/components/landing/fonts";
import { demoPassportHref, PRICING } from "@/lib/landingContent";
import type { LandingStats } from "@/lib/landingStats";
import { RANKS } from "@/lib/milestoneRules";
import { POINTS_BY_KIND, POINTS_VERIFIED, pointsLabel } from "@/lib/stampClasses";

const n = (v: number) => new Intl.NumberFormat("en").format(v);

const Section = ({ id, className = "", children }: { id?: string; className?: string; children: React.ReactNode }) => (
  <section id={id} className={`scroll-mt-20 px-4 sm:px-6 ${className}`}><div className="mx-auto max-w-[1200px]">{children}</div></section>
);
const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="font-stamp text-[15px] uppercase tracking-[0.14em] text-terracotta">{children}</p>;
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-2 text-[30px] leading-[1.08] sm:text-[38px]">{children}</h2>;
const Lead = ({ children }: { children: React.ReactNode }) => <p className="mt-3 max-w-2xl text-[17px] leading-[1.6] text-cocoa/85">{children}</p>;
const Primary = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-honey px-6 text-[16px] font-extrabold text-white shadow-[0_8px_22px_rgba(224,138,46,0.38)] transition hover:bg-honey-deep sm:w-auto">{children}</Link>
);

/** A round rubber-stamp mark with a number and an icon. */
function StampMark({ num, icon, label }: { num: number; icon: React.ReactNode; label: string }) {
  return (
    <div className="stamp flex h-[120px] w-[120px] shrink-0 flex-col items-center justify-center text-sky" style={{ transform: `rotate(${[-6, 4, -3][num - 1]}deg)` }}>
      {icon}
      <span className="mt-1 text-[22px]">{label}</span>
      <span className="text-[12px] tracking-[0.2em]">step {num}</span>
    </div>
  );
}

function SolanaMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <polygon points="5,3.5 22,3.5 19,7.5 2,7.5" /><polygon points="2,10 19,10 22,14 5,14" /><polygon points="5,16.5 22,16.5 19,20.5 2,20.5" />
    </svg>
  );
}

/** A passport on a phone, drawn in CSS: what a customer sees after a few stamps. */
function PhoneMockup() {
  const stamps = [["Eco café", "Presence stamp", POINTS_BY_KIND.cafe], ["Online eco shop", "Verified order", POINTS_VERIFIED], ["Eco hotel", "Presence stamp", POINTS_BY_KIND.hotel]] as const;
  return (
    <div className="mx-auto w-[272px] rounded-[38px] border-[8px] border-cocoa bg-paper p-3 shadow-[0_24px_50px_rgba(58,42,28,0.3)]" aria-label="A customer's eco passport on a phone" role="img">
      <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-cocoa" />
      <p className="font-journal-display text-[18px] font-bold leading-tight">My eco passport</p>
      <div className="mt-2 flex items-end justify-between rounded-2xl bg-kraft/60 px-3 py-2.5">
        <span><span className="block text-[10px] font-bold uppercase tracking-wider text-cocoa/70">Points</span><span className="font-journal-display text-[26px] font-bold leading-none">{POINTS_BY_KIND.cafe + POINTS_VERIFIED + POINTS_BY_KIND.hotel}</span></span>
        <span className="text-right text-[11px] font-bold text-cocoa/75">3 stamps<br />3 proofs on Solana</span>
      </div>
      <ul className="mt-3 space-y-2">
        {stamps.map(([place, kind, pts]) => (
          <li key={place} className="flex items-center gap-2.5 rounded-xl bg-white/70 px-2.5 py-2">
            <span className="stamp flex h-9 w-9 items-center justify-center text-sky"><Stamp size={14} /></span>
            <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-[13px] font-extrabold">{place}</span><span className="block text-[11px] text-cocoa/70">{kind}</span></span>
            <span className="text-[12px] font-extrabold text-honey-deep">+{pts}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-kraft/50 p-2">
        <Image src="/landing/cards/warden.webp" alt="" width={600} height={840} sizes="40px" className="w-10 rounded-md" />
        <span className="text-[12px] font-bold leading-tight">Bee Guardian · Warden<br /><span className="font-semibold text-cocoa/70">Soulbound NFT, earned at {RANKS[1].at} points</span></span>
      </div>
    </div>
  );
}

/** Live totals as three square rubber stamps: proofs, single-use plastic items avoided (counted, not weighed), kg CO₂e. */
function CounterStrip({ stats, className = "" }: { stats: LandingStats | null; className?: string }) {
  if (!stats) return null;
  const tiles = [[n(stats.proofs), "proofs", -2], [n(stats.plasticItems), "plastic items avoided", 1.5], [n(stats.co2Kg), "kg CO₂e avoided", -1]] as const;
  return (
    <div className={`flex-wrap items-center gap-x-3 gap-y-3 lg:gap-x-4 ${className}`} aria-label="Verified so far">
      {tiles.map(([v, l, r]) => (
        <div key={l} className="stamp-tile flex h-[92px] w-[104px] flex-col items-center justify-center px-1.5 text-center text-cocoa/80 lg:h-[96px] lg:w-[118px]" style={{ transform: `rotate(${r}deg)` }}>
          <span className="font-journal-display text-[26px] font-bold tracking-tight">{v}</span>
          <span className="mt-1.5 text-[12px] leading-[1.1]">{l}</span>
        </div>
      ))}
      <span className="inline-flex basis-full items-center gap-1.5 text-[13px] font-bold text-cocoa/70 lg:basis-auto"><Link2 size={14} /> anchored on Solana · estimates</span>
    </div>
  );
}

/** Which hero art the landing shows: "island" (the full-bleed island world, components/landing/IslandHero.tsx) or "cards" (the card fan and the
 *  bee). Set NEXT_PUBLIC_LANDING_HERO to switch; the copy is the same in both. */
const HERO = (process.env.NEXT_PUBLIC_LANDING_HERO ?? "island") as "island" | "cards";

export default function Landing({ stats }: { stats: LandingStats | null }) {
  // The three owner doors (images in public/landing/doors; cafés and restaurants share one door, a small café/restaurant switch is planned):
  // how their customers collect a stamp, what each side gets, and setup. An eco store sells in store, online or both, so online selling
  // lives in that tile. Points per kind come from lib/stampClasses.ts.
  const doors = [
    { img: "coffee", title: "Café / Restaurant", join: "a café or restaurant", door: "QR at the counter, on the table card or with the bill", stamp: `Presence stamp, ${pointsLabel(POINTS_BY_KIND.cafe)} per visit, once a day`,
      you: "An eco star rating and a map pin, and regulars who have a reason to keep coming back. The stars show guests what you actually do: no plastic straws, local produce, no single-use packaging.", them: "A visible streak of real choices: their own cup, your reusable cups, the refill they bought. Shareable as a card in one tap.", setup: "Print one QR code, tick your practices" },
    { img: "hotel", title: "Hotel / Resort", join: "a hotel or resort", door: "QR at reception or in the room", stamp: `Presence stamp, ${pointsLabel(POINTS_BY_KIND.hotel)} per stay`,
      you: "An eco star rating from your published practices checklist, and a map pin guests find before they book.", them: "A stamp from their holiday, with your name on it, in the passport they show around.", setup: "Print one QR code, tick your practices" },
    { img: "store", title: "Eco store", join: "an eco store", door: "QR at the till, WooCommerce plugin or claim cards for online orders", stamp: `Verified purchase, ${pointsLabel(POINTS_VERIFIED)} with the order's real impact: an online order today, a scanned receipt in store next. A QR at the till is ${pointsLabel(POINTS_BY_KIND.eco_shop)} until then`,
      you: "A public impact page that adds up every order, a listing in the eco shops directory, and referrals from cafés' and hotels' checklists.", them: "Their order's exact impact and what it replaced, in their passport and on the share image.", setup: "Print one QR code, or install the plugin in about 10 minutes" },
  ];
  const partners = [
    { img: "superbee", name: "SuperBee", w: 142 },
    { img: "freebird", name: "Free Bird Cafe", w: 160 },
    { img: "studio-naenna", name: "Studio Naenna", w: 159 },
  ];
  return (
    <div className={`journal grain min-h-screen ${journalFonts}`}>
      <LandingNav />

      {/* Hero: the copy is shared; HERO picks the art. "island": copy centred in the sky above the island plate. "cards": copy left, the card fan
          and the bee right (design brief, section 3) on kraft paper with grain and a faint vignette. */}
      {HERO === "island" ? (
        <IslandHero>
          <div className="mx-auto max-w-[880px] text-center">
            <p className="stamp inline-block -rotate-6 px-4 py-2 text-[15px] text-sky">Verified eco impact</p>
            <h1 className="mt-4 text-[36px] leading-[1.04] sm:text-[46px] lg:text-[56px]">Show your customers exactly how much plastic and CO₂ they saved with you. <span className="text-honey-deep">Verified, not claimed.</span></h1>
            <p className="mx-auto mt-5 max-w-xl text-[18px] leading-[1.6] text-cocoa/85">Every order or visit becomes a stamp in your customer&apos;s eco passport, anchored on Solana so nobody can fake it.</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
              <Primary href="/join">Join as a business <ArrowRight size={18} /></Primary>
              <Link href={demoPassportHref()} className="inline-flex h-12 items-center text-[16px] font-extrabold text-cocoa underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey">See a live passport</Link>
            </div>
            <CounterStrip stats={stats} className="mt-8 flex justify-center" />
          </div>
        </IslandHero>
      ) : (
      <Section className="vignette grain overflow-hidden bg-kraft pt-10 pb-12 sm:pt-14 lg:flex lg:min-h-[86vh] lg:items-center lg:pt-16 lg:pb-16">
        <div className="relative grid items-center gap-10 lg:grid-cols-[6fr_6fr] lg:gap-10">
          <div>
            <p className="stamp inline-block -rotate-6 px-4 py-2 text-[15px] text-sky">Verified eco impact</p>
            <h1 className="mt-4 text-[38px] leading-[1.04] sm:text-[48px] lg:text-[60px]">Show your customers exactly how much plastic and CO₂ they saved with you. <span className="text-honey-deep">Verified, not claimed.</span></h1>
            <p className="mt-5 max-w-xl text-[18px] leading-[1.6] text-cocoa/85">Every order or visit becomes a stamp in your customer&apos;s eco passport, anchored on Solana so nobody can fake it.</p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
              <Primary href="/join">Join as a business <ArrowRight size={18} /></Primary>
              <Link href={demoPassportHref()} className="inline-flex h-12 items-center text-[16px] font-extrabold text-cocoa underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey">See a live passport</Link>
            </div>
            <CounterStrip stats={stats} className="mt-8 hidden lg:flex" />
          </div>
          <HeroArt />
          <CounterStrip stats={stats} className="-mt-2 flex lg:hidden" />
        </div>
      </Section>
      )}

      {/* Partners: logos muted until hovered; the founding partner named in text. */}
      <Section className="pb-12">
        <div className="border-y border-cocoa/10 py-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5" aria-label="Partners">
            <li className="text-[14px] font-bold text-cocoa/65">Founding partner: <a href="https://superbee.me" className="text-cocoa underline decoration-sky underline-offset-4" target="_blank" rel="noopener">SuperBee</a>, a Certified B Corp</li>
            {partners.map((p) => (
              <li key={p.img} className="opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0" title={p.name}>
                <Image src={`/landing/partners/${p.img}.webp`} alt={p.name} width={p.w} height={160} className="h-14 w-auto rounded-md" />
              </li>
            ))}
          </ul>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[14px] font-bold text-cocoa/65">
            <li className="inline-flex items-center gap-1.5"><SolanaMark className="h-3.5 w-3.5" /> Winner · Best Use of Solana, Colosseum Chiang Mai 2026</li>
            <li>Handmade proofs from Chiang Mai, Thailand</li>
          </ul>
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" className="py-12 lg:py-20">
        <Eyebrow>How it works</Eyebrow>
        <H2>Three stamps and you&apos;re live</H2>
        <Lead>No plugin to install for cafés and hotels, a webhook for online shops. Your customers need nothing but their phone.</Lead>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            { icon: <Plug size={26} />, label: "connect", alt: "A café counter from the cashier's side: the EcoProof QR card in a stand on the counter, Scan to collect your eco stamp", title: "Connect your shop or print your QR", body: "WooCommerce webhook for online orders, printable claim cards for parcels, a QR code for the counter or reception." },
            { icon: <Stamp size={26} />, label: "stamp", alt: "Four steps on kraft paper: a phone scans the EcoProof QR card, the record is hashed and written to Solana as a proof, the stamp lands in the eco passport, and the Sentinel Bee Guardian card is minted", title: "Every verified order or visit becomes a stamp", body: `A café visit is worth ${pointsLabel(POINTS_BY_KIND.cafe)}, a hotel stay ${POINTS_BY_KIND.hotel}, a verified eco store purchase ${POINTS_VERIFIED}. Each stamp is one record, hashed and written to Solana.` },
            { icon: <Share2 size={26} />, label: "share", alt: "The share image of a passport on kraft paper: the Warden Bee Guardian rank card, 7 points, progress to Guardian and stamps from three places, verified on Solana", title: "Your customers share their impact, you get the credit", body: "Their passport names your business on every stamp. A share image is one tap away, and the proof is one tap further." },
          ].map((s, i) => (
            <li key={s.label} className="flex flex-col">
              <div className="relative">
                <Image src={`/landing/steps/${s.label}.webp`} alt={s.alt} width={800} height={800} sizes="(min-width: 768px) 360px, 100vw" className="sticker aspect-square w-full object-cover" style={{ transform: `rotate(${[-1, 1.2, -0.8][i]}deg)` }} />
                <div className="absolute -bottom-6 -right-2 scale-[0.8] sm:-right-4 sm:scale-100"><StampMark num={i + 1} icon={s.icon} label={s.label} /></div>
              </div>
              <h3 className="mt-10 text-[20px] leading-tight">{s.title}</h3>
              <p className="mt-2 text-[15.5px] leading-[1.6] text-cocoa/80">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* What customers get */}
      <Section id="customers" className="py-12 lg:py-20">
        <div className="stitched grain rounded-[20px] bg-kraft/55 px-5 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="grid items-center gap-10 lg:grid-cols-[300px_1fr] lg:gap-14">
            <PhoneMockup />
            <div className="min-w-0">
              <Eyebrow>What your customers get</Eyebrow>
              <H2>&ldquo;I&apos;m eco, and I have proof.&rdquo;</H2>
              <Lead>A passport that fills up with real choices, place by place. Enough stamps unlock a Bee Guardian: a soulbound NFT that can&apos;t be bought or transferred, only earned.</Lead>
              <ul className="scroll-snap-x no-scrollbar -mx-5 mt-8 flex gap-4 overflow-x-auto px-5 pb-2 sm:-mx-10 sm:px-10 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-3 lg:overflow-visible lg:px-0" aria-label="The five Bee Guardian ranks">
                {RANKS.map((r, i) => (
                  <li key={r.key} className="w-[150px] shrink-0 text-center lg:w-auto" style={{ transform: `rotate(${(i - 2) * 2.5}deg)` }}>
                    <Image src={`/landing/cards/${r.key}.webp`} alt={`${r.name} Bee Guardian card`} width={600} height={840} sizes="150px" className="w-full rounded-[10px] shadow-[0_10px_24px_rgba(58,42,28,0.25)]" />
                    <span className="mt-3 block text-[14px] font-extrabold">{r.name}</span>
                    <span className="block text-[12px] font-bold text-cocoa/65">{r.at} point{r.at === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Verified, not claimed */}
      <Section className="py-12 lg:py-20">
        <Eyebrow>Verified, not claimed</Eyebrow>
        <H2>Anyone can print a green badge</H2>
        <Lead>EcoProof doesn&apos;t grade your marketing. It records what actually happened, and lets anyone check the record.</Lead>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-[18px] border-2 border-dashed border-cocoa/25 p-6">
            <h3 className="flex items-center gap-2 text-[20px] text-cocoa/60"><X size={20} className="text-terracotta" /> Claims</h3>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {["100% eco-friendly", "Green choice", "Sustainably sourced", "Planet positive", "Carbon neutral*"].map((c) => (
                <li key={c} className="rounded-full bg-paper px-3.5 py-1.5 text-[14px] font-bold text-cocoa/55 line-through decoration-terracotta decoration-2 ring-1 ring-cocoa/15">{c}</li>
              ))}
            </ul>
            <p className="mt-5 text-[14.5px] leading-[1.6] text-cocoa/70">A badge says nothing about one specific order or visit. Nobody can check it, so nobody believes it.</p>
          </div>
          <div className="sticker grain rounded-[18px] bg-kraft/60 p-6">
            <h3 className="flex items-center gap-2 text-[20px]"><Check size={20} className="text-leaf" /> Proof</h3>
            <ol className="mt-4 space-y-3 text-[15px] leading-snug">
              {[[<Receipt key="r" size={18} />, "Order line items", "What was bought, from your shop system, not a form."], [<Cpu key="c" size={18} />, "Impact estimate", "Each item sorted into a transparent factor table: plastic items avoided, CO₂e, packaging."], [<Hash key="h" size={18} />, "Solana proof", "The record's SHA-256 goes on-chain as a memo plus a claim account: one scan, one stamp, never twice."]].map(([icon, t, b]) => (
                <li key={t as string} className="flex gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-sky ring-1 ring-cocoa/10">{icon}</span><span><b className="font-extrabold">{t}</b><br /><span className="text-cocoa/80">{b}</span></span></li>
              ))}
            </ol>
            {stats?.proofUrl && <a href={stats.proofUrl} target="_blank" rel="noopener" className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-extrabold underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey"><SolanaMark /> See a real proof on Solana Explorer</a>}
          </div>
        </div>
      </Section>

      {/* Impact you can publish */}
      <Section id="impact" className="py-12 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <Eyebrow>Impact you can publish</Eyebrow>
            <H2>Numbers your customers added up for you</H2>
            <Lead>Every verified purchase at your shop adds to one public impact page. Plastic avoided leads, CO₂e second, packaging third, and every figure links back to its proofs.</Lead>
            <p className="mt-3 text-[14px] font-bold text-cocoa/65">Impact figures are estimates from a transparent factor table, not audited lifecycle data. An embeddable widget for your own site is on the way.</p>
          </div>
          <div className="sticker grain rounded-[20px] bg-paper p-6 ring-1 ring-cocoa/10 sm:p-8">
            <p className="font-stamp text-[15px] uppercase tracking-[0.14em] text-cocoa/60">{stats?.example ? `${stats.example.name} · verified impact` : "Your shop · verified impact"}</p>
            {(() => {
              const i = stats?.example?.impact ?? { purchases: 0, customers: 0, plasticItems: 0, co2Kg: 0, packagingG: 0 };
              const rows = [[n(i.plasticItems), "single-use plastic items avoided"], [`${n(i.co2Kg)} kg`, "CO₂e avoided"], [`${n(Math.round(i.packagingG / 100) / 10)} kg`, "packaging avoided"]] as const;
              return (
                <dl className="mt-4 divide-y divide-cocoa/10">
                  {rows.map(([v, l], k) => <div key={l} className="flex items-baseline justify-between gap-4 py-3"><dt className="text-[15px] font-bold text-cocoa/80">{l}</dt><dd className={`font-journal-display font-bold ${k === 0 ? "text-[34px] text-honey-deep" : "text-[24px]"}`}>{v}</dd></div>)}
                  <div className="flex items-baseline justify-between gap-4 py-3 text-[13px] font-bold text-cocoa/65"><dt>From {n(i.purchases)} verified purchases by {n(i.customers)} customers</dt><dd className="inline-flex items-center gap-1"><Link2 size={12} /> on Solana</dd></div>
                </dl>
              );
            })()}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {stats?.example ? <Link href={`/places/${stats.example.id}`} className="text-[15px] font-extrabold underline decoration-sky decoration-[3px] underline-offset-4">See the live page →</Link> : <span />}
              <Link href="/join" className="inline-flex h-11 items-center justify-center rounded-full bg-cocoa px-5 text-[14px] font-extrabold text-paper hover:bg-honey-deep">Get yours</Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Business types */}
      <Section id="businesses" className="py-12 lg:py-20">
        <Eyebrow>Built for Thai eco businesses</Eyebrow>
        <H2>Pick your door</H2>
        <Lead>Three kinds of business, one passport. What differs is how your customers collect their stamp, and what the stamp is worth.</Lead>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {doors.map((d, i) => (
            <li key={d.img} className="stitched grain flex flex-col rounded-[20px] bg-kraft/50 p-4 sm:p-5">
              <Image src={`/landing/doors/${d.img}.webp`} alt="" width={640} height={640} sizes="(min-width: 768px) 360px, 100vw" className="sticker aspect-square w-full object-cover" style={{ transform: `rotate(${[-1.5, 1, -1][i]}deg)` }} />
              <h3 className="mt-5 text-[22px] leading-tight">{d.title}</h3>
              <p className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full bg-paper px-3 py-1 text-[13px] font-extrabold text-cocoa ring-1 ring-cocoa/10"><Stamp size={14} className="shrink-0 text-sky" /> {d.door}</p>
              <dl className="mt-3 flex-1 space-y-2.5 text-[14.5px] leading-[1.5]">
                <div><dt className="font-stamp text-[14px] uppercase tracking-[0.12em] text-terracotta">The stamp</dt><dd className="text-cocoa/85">{d.stamp}</dd></div>
                <div><dt className="font-stamp text-[14px] uppercase tracking-[0.12em] text-terracotta">You get</dt><dd className="text-cocoa/85">{d.you}</dd></div>
                <div><dt className="font-stamp text-[14px] uppercase tracking-[0.12em] text-terracotta">Your customers get</dt><dd className="text-cocoa/85">{d.them}</dd></div>
              </dl>
              <p className="mt-3 text-[13px] font-bold text-cocoa/60">Setup: {d.setup}</p>
              <Link href="/join" className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-extrabold text-cocoa underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey">Join as {d.join} <ArrowRight size={16} /></Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[14px] font-bold text-cocoa/65">Cafés, restaurants and hotels have stars; stores have an impact page instead. Every kind gets a public place page, a map pin and share images.</p>
      </Section>

      {/* Why a blockchain */}
      <Section id="why-chain" className="py-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
          <div>
            <Eyebrow>Why blockchain</Eyebrow>
            <H2>Why put a coffee stamp on Solana?</H2>
            <Lead>Because a claim you can only check by trusting us is still a claim. A proof has to hold up without us.</Lead>
            <ul className="mt-6 space-y-4 text-[15.5px] leading-[1.6]">
              {[
                ["Nobody can edit history, not even EcoProof.", "Each stamp's record is hashed and the hash is written to Solana the moment it's made. Change the record later and the hash no longer matches: anyone can recompute it and compare."],
                ["One scan, one stamp, by design.", "Every stamp also creates a claim account on-chain. Claiming the same order or card twice fails on the chain itself, not in a rule we could quietly relax."],
                ["It outlives the app.", "If EcoProof closed tomorrow, every proof would still be readable on a public network that no company owns."],
                ["Earned, not bought.", "Bee Guardians are soulbound NFTs: they can't be sold or transferred, so the only way to show one is to have earned it."],
                ["Invisible to customers.", "No wallet, no coins, nothing to buy. A fee is a fraction of a satang and we pay it. A wallet is only needed to receive a Bee Guardian."],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-3"><Check size={20} className="mt-1 shrink-0 text-leaf" /><span><b className="font-extrabold">{t}</b> <span className="text-cocoa/80">{b}</span></span></li>
              ))}
            </ul>
          </div>
          <div className="sticker grain self-start rounded-[20px] bg-kraft/60 p-6 sm:p-8">
            <p className="font-stamp text-[15px] uppercase tracking-[0.14em] text-cocoa/60">What goes on the chain, and what doesn&apos;t</p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 text-[18px]"><Hash size={18} className="text-sky" /> On Solana</h3>
                <ul className="mt-2 space-y-1.5 text-[14.5px] leading-snug text-cocoa/85">
                  <li>The SHA-256 fingerprint of each stamp record</li><li>A claim account per order, card or visit</li><li>The fingerprint of each published practices checklist</li><li>Bee Guardian NFTs, minted to the customer</li>
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-[18px]"><X size={18} className="text-terracotta" /> Never on the chain</h3>
                <ul className="mt-2 space-y-1.5 text-[14.5px] leading-snug text-cocoa/85">
                  <li>Names, emails, phone numbers</li><li>Where a customer was and when</li><li>What exactly they bought</li><li>Anything that would identify a person</li>
                </ul>
                <p className="mt-2 text-[13px] font-bold text-cocoa/60">Personal data stays in our database under Thailand&apos;s PDPA, and a fingerprint can&apos;t be turned back into it.</p>
              </div>
            </div>
            <p className="mt-5 border-t border-cocoa/10 pt-4 text-[14px] leading-[1.6] text-cocoa/80">Honest footnote: a proof shows a record wasn&apos;t altered after it was made. It proves a purchase only through the verified-order door; a QR stamp proves a visit, not what was bought. During the hackathon phase proofs are written to Solana devnet.</p>
            {stats?.proofUrl && <a href={stats.proofUrl} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-extrabold underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey"><SolanaMark /> Open the newest proof on Solana Explorer</a>}
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" className="py-12 lg:py-20">
        <Eyebrow>Pricing</Eyebrow>
        <H2>Free for the founding fifty</H2>
        <Lead>Stamps, proofs and the public impact page are included in every plan. The chain fees are on us.</Lead>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {PRICING.map((p, i) => (
            <li key={p.name} className={`rounded-[18px] p-6 ${i === 0 ? "sticker grain bg-honey/15 ring-2 ring-honey" : "bg-paper ring-1 ring-cocoa/15"}`}>
              <p className="font-stamp text-[16px] uppercase tracking-[0.14em] text-cocoa/65">{p.name}</p>
              <p className="mt-2 font-journal-display text-[36px] font-bold leading-none">{p.price}<span className="text-[16px] font-bold text-cocoa/65"> {p.period}</span></p>
              <p className="mt-3 text-[15px] leading-[1.6] text-cocoa/80">{p.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] font-bold text-cocoa/55">Final prices are still being decided; founding businesses never pay more than they signed up for.</p>
      </Section>

      {/* Final CTA */}
      <Section className="py-12 lg:py-20">
        <div className="stitched grain rounded-[24px] bg-kraft px-6 py-12 text-center sm:px-10 lg:py-16">
          <h2 className="mx-auto max-w-3xl text-[32px] leading-[1.08] sm:text-[42px]">Give your customers something to show off.</h2>
          <div className="mt-7 flex justify-center"><Primary href="/join">Join as a business <ArrowRight size={18} /></Primary></div>
          <p className="mt-4 text-[15px] font-bold text-cocoa/70">Takes 10 minutes, no plugin required.</p>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-cocoa/10 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[1fr_auto_auto]">
          <div>
            <JournalWordmark className="text-[20px]" />
            <p className="mt-2 max-w-xs text-[14px] leading-[1.6] text-cocoa/70">A verified eco passport for customers of sustainable shops, cafés, markets and online brands. Built in Chiang Mai, Thailand.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-cocoa/70"><SolanaMark className="h-3.5 w-3.5" /> Winner · Best Use of Solana, Colosseum 2026 Chiang Mai</p>
          </div>
          <ul className="space-y-2 text-[14px] font-bold">
            {SECTIONS.map(([href, label]) => <li key={href}><a href={href} className="hover:underline">{label}</a></li>)}
            <li><a href="#why-chain" className="hover:underline">Why blockchain</a></li>
            <li><Link href="/about" className="hover:underline">The full guide</Link></li>
          </ul>
          <ul className="space-y-2 text-[14px] font-bold">
            <li><Link href="/map" className="hover:underline">Map of places</Link></li>
            <li><Link href="/shops" className="hover:underline">Eco shops</Link></li>
            <li><Link href="/passport" className="hover:underline">My passport</Link></li>
            <li><a href="https://ecoproofai.stylebar.de" className="hover:underline" target="_blank" rel="noopener">About the project</a></li>
            <li><Link href="/rules" className="hover:underline">Rules</Link> · <Link href="/privacy" className="hover:underline">Privacy</Link></li>
          </ul>
        </div>
        <p className="mx-auto mt-8 max-w-[1200px] text-[12px] text-cocoa/55">Proofs are written to Solana devnet during the hackathon phase. Impact figures are estimates, not audited data.</p>
      </footer>
    </div>
  );
}
