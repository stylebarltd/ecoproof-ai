import Link from "next/link";
import { Check, Camera, Coffee, Flag, Gift, Heart, Package, QrCode, Share2, ShieldCheck, Smartphone, Sparkles, Store, Wallet } from "lucide-react";
import { RANKS, rankWebp } from "@/lib/milestoneRules";
import { POINTS_BY_KIND, POINTS_CARD, POINTS_VERIFIED } from "@/lib/stampClasses";
import InviteShop from "@/components/InviteShop";
import LandingNav from "@/components/landing/LandingNav";
import { journalFonts } from "@/components/landing/fonts";

export const metadata = {
  title: "Help · EcoProof",
  description: "Help for EcoProof: every way to collect a stamp, points and ranks, your passport and NFTs, what EcoProof AI does, how the proof works, and answers to common questions.",
};

// The help page (Pola, 2026-11-20/21: help, FAQ and more details about how it works). The homepage (#how) tells how EcoProof works in short; this page has
// the detail: every way to collect a stamp, points and ranks, passport and NFTs, EcoProof AI, the proof and its honest limits, questions. No set-up guide for
// shops: that is /join. It was the app's "How it works" tab and repeated the homepage; it now sits outside the (app)
// group and wears the homepage's chrome, like /join. The anchors #ai, #points, #customers, #help, #proof, #test-network and #faq are linked from elsewhere: keep them.

const Panel = ({ id, className = "", children }: { id?: string; className?: string; children: React.ReactNode }) => (
  <section id={id} className={`scroll-mt-24 rounded-[28px] bg-white/70 p-5 ring-1 ring-cocoa/10 ${className}`}>{children}</section>
);
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 text-[20px] leading-tight">{children}</h2>;
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mb-1 mt-4 text-[15px] leading-tight">{children}</h3>;
const P = ({ children }: { children: React.ReactNode }) => <p className="text-[14px] leading-relaxed text-ink/90">{children}</p>;

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl bg-white/45 px-3.5 py-3 ring-1 ring-white/70 open:bg-white/60">
      <summary className="cursor-pointer list-none text-[14px] font-bold">{q}</summary>
      <div className="mt-2 text-[13.5px] leading-relaxed text-ink/90">{children}</div>
    </details>
  );
}

export default function About() {
  return (
    <div className={`journal grain min-h-screen ${journalFonts}`}>
      <LandingNav page="about" />
      <main className="px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
    <div className="mx-auto max-w-[720px] space-y-4">
      <header className="text-center">
        <p className="font-stamp text-[14px] uppercase tracking-[0.14em] text-terracotta-ink">Answers and details</p>
        <h1 className="mt-1 text-[34px] leading-[1.05]">Help</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cocoa/90">Every way to collect a stamp, how points and ranks work, what the AI does, how the proof works and where its limits are. New here? Start with <Link href="/#how" className="font-bold underline">How it works</Link> on the homepage.</p>
      </header>

      {/* In-page navigation */}
      <nav aria-label="On this page" className="flex flex-wrap justify-center gap-2 py-1 text-[13px] font-bold">
        {[["#faq", "Questions"], ["#collect", "Collect a stamp"], ["#points", "Points and ranks"], ["#customers", "Passport and NFTs"], ["#ai", "The AI"], ["#proof", "The proof"], ["#help", "Help out"], ["/rules", "Eco rules for places"]].map(([href, label]) => (
          <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-full bg-white/70 px-4 ring-1 ring-cocoa/10 hover:bg-white">{label}</a>
        ))}
      </nav>

      {/* FAQ */}
      <Panel id="faq" className="space-y-2">
        <H2>Questions</H2>
        <Faq q="Do I need a wallet?">No, you can collect stamps without one. You need a wallet (Phantom or Solflare) to receive your Bee Guardian NFTs and to keep your passport on other devices.</Faq>
        <Faq q="Does it cost anything?">No. EcoProof is free, connecting a wallet costs nothing, and you never pay a network fee.</Faq>
        <Faq q="I can't collect a stamp from my passport. Why?">At real places a stamp is collected by scanning the place&apos;s QR code, so it can only be done there. Open <b>Scan</b> and tap <b>Scan a QR code</b> or use your camera.</Faq>
        <Faq q="It says I already collected a stamp today.">A place gives one stamp per person per day. Come back tomorrow. Parcel cards and orders work once each.</Faq>
        <Faq q="Why does it ask for my location?">Places set up by their owners check that you are really there. Your location is used for that check only.</Faq>
        <Faq q="The camera doesn't open inside my wallet app.">Wallet apps often block the camera in their built-in browser. Open EcoProof in Safari or Chrome instead, or point your phone&apos;s own camera app at the QR code. Connecting your wallet from Safari or Chrome works too: the wallet app opens and brings you back.</Faq>
        <Faq q="What data do you keep?">Your passport (a device ID, or your account: Google or Facebook name and email, or wallet address) and your stamps. For online orders we keep only the order number and the products and quantities, never names, emails, addresses or prices. The details are in our <Link href="/privacy" className="font-bold underline">privacy page</Link>.</Faq>
        <Faq q="What if I lose my phone?">If you signed in (with Google, Facebook or a wallet), sign in the same way on the new device and your passport is back. A passport that was never signed in stays on the old device.</Faq>
        <Faq q="I run a shop. How do I join?">Open <Link href="/join" className="font-bold underline">Run a place?</Link>, sign in and follow the steps. Read the <Link href="/rules" className="font-bold underline">eco rules</Link> first.</Faq>
      </Panel>

      {/* Every way to collect a stamp, in full: the homepage shows them as three pictures with a line each */}
      <Panel id="collect">
        <div className="mb-1 flex items-center gap-2"><QrCode size={20} className="text-sage-700" /><H2>Every way to collect a stamp</H2></div>
        <P>There are four ways, and they all end the same way: a stamp in your passport and a record on Solana. You need no app and no account to start.</P>
        <ul className="mt-3 space-y-3 text-[14px] leading-relaxed">
          <li className="flex gap-3"><Store size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>At a café, restaurant, hotel or eco shop ({POINTS_BY_KIND.cafe} point):</b> scan the EcoProof QR code on the counter, the table or at reception. Open <Link href="/scan" className="font-bold underline">Scan</Link>, or use your phone&apos;s own camera. One stamp per place per day, so a hotel stay counts every day you scan. Some places check that you are really there and will ask for your location.</span></li>
          <li className="flex gap-3"><Package size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>A card in your parcel ({POINTS_CARD} points):</b> shops that sell through a marketplace such as Amazon, Lazada or Shopee can put a small card in the box. Scan it. Each card works once.</span></li>
          <li className="flex gap-3"><Gift size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>From an order email ({POINTS_VERIFIED} points):</b> a shop that runs EcoProof on its own website sends a personal QR code and a <b>Collect my stamp</b> button in the order email. Tap it. The shop tells us what was in the order, so this stamp is a <b>verified purchase</b> and shows what your order saved. A flyer in the parcel may remind you; the stamp itself is in the email.</span></li>
          <li className="flex gap-3"><Camera size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>A receipt in an eco shop ({POINTS_VERIFIED} points):</b> bought something plastic-free in a shop that&apos;s on EcoProof? Open <Link href="/scan" className="font-bold underline">Scan</Link> and tap <b>Photograph a receipt</b> while you&apos;re still in the shop. EcoProof reads what you bought, you check it, and the stamp is a verified purchase too. Only in the shop (we check your location), with a receipt from the last 7 days; each receipt once; we keep the items, never the photo. You can scan the till&apos;s QR code on the same visit as well.</span></li>
        </ul>
      </Panel>

      {/* Points and ranks */}
      <Panel id="points">
        <H2>Points and ranks</H2>
        <P>Ranks are reached by <b>points</b>, not by how many times you scan: a verified purchase is worth {POINTS_VERIFIED}; a visit is worth {POINTS_BY_KIND.cafe}, at a café, restaurant, hotel or eco shop till, once a day per place; the card in a parcel is worth {POINTS_CARD}. A receipt scanned in an eco shop counts as a verified purchase too. Every stamp records a proof on Solana, but only reaching a rank mints an NFT.</P>
        <div className="mt-4 grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-5">
          {RANKS.map((r) => (
            <div key={r.key} className="text-center">
              <div className="bee-edge rounded-[22px] p-[2px]">
                <div className="rounded-[20px] bg-[linear-gradient(160deg,#1d2416,#2c361f_55%,#14180e)] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={rankWebp(r.key)} alt={`${r.name} Bee Guardian`} width={512} height={512} loading="lazy" className="aspect-square w-full object-contain" />
                </div>
              </div>
              <p className="mt-1.5 font-heading text-[15px] leading-none">{r.name}</p>
              <p className="text-[11px] font-semibold text-ink/70">Tier {r.tier} · {r.at} point{r.at === 1 ? "" : "s"}</p>
            </div>
          ))}
        </div>
        <P>The Bee Guardians are <b>soulbound</b>: they are minted to your wallet and can&apos;t be sold or transferred. They can only be earned. Each rank is a different guardian, from Sentinel to Paragon. The first stamp unlocks Sentinel; one verified purchase is worth 5 points, so a second one reaches Warden.</P>
              <H3>Two kinds of stamp</H3>
        <div className="mt-2 grid gap-3">
          <div className="relative rounded-2xl bg-gradient-to-br from-honey-300/60 via-white/70 to-honey-300/30 p-3.5 ring-2 ring-honey-400 shadow-[0_10px_28px_rgba(232,163,23,0.4)]">
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-honey-700">Verified purchase <span className="rounded-full bg-honey-500 px-1.5 py-0.5 text-[9px] text-ink">+{POINTS_VERIFIED} pts</span></span>
            <p className="mt-1 font-heading text-[16px]">Green Goods Co. <span className="font-sans text-[11px] font-semibold text-ink/60">(example online shop)</span></p>
            <p className="text-[12.5px] font-bold">130 g plastic avoided · 390 g CO₂ saved</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink/80">Comes from a real online order. Because the shop tells us what was in it, the stamp shows the real impact of your purchase. Worth <b>{POINTS_VERIFIED} points</b>.</p>
          </div>
          <div className="rounded-2xl bg-white/45 p-3.5 ring-1 ring-white/70">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sage-800">Presence stamp <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[9px]">+{POINTS_BY_KIND.cafe} to {POINTS_CARD} pt</span></span>
            <p className="mt-1 font-heading text-[16px]">A café <span className="font-sans text-[11px] font-semibold text-ink/60">(example)</span></p>
            <p className="text-[12.5px] leading-snug text-ink/80">Comes from a counter QR or a parcel card. It proves you were there or that you received the parcel, nothing about what was bought, so there is no impact number. Worth <b>{POINTS_BY_KIND.cafe} point</b> for a visit (café, restaurant, hotel or eco shop till, once a day each), <b>{POINTS_CARD}</b> for the card in a parcel.</p>
          </div>
        </div>
        <P>Both kinds live in the same passport.</P>
      </Panel>

      {/* Keeping the passport and receiving the NFTs: what the homepage does not spell out. Carries #customers, which older links point to. */}
      <Panel id="customers">
        <div className="mb-1 flex items-center gap-2"><Smartphone size={20} className="text-sage-700" /><H2>Your passport and your NFTs</H2></div>
        <P>You can collect stamps without signing in. To keep your passport on every device, tap <b>Sign in</b> and choose Google, Facebook or a Solana wallet (Phantom and Solflare both work). With a wallet you only sign a short free message: no fee, no funds move, and we never see your keys. On a phone, the wallet app opens, you approve, and it brings you back. Anything you collected before signing in is added to your passport.</P>
        <P>To <b>receive your NFTs</b> you need a wallet. Signed in with Google or Facebook? Your Bee Guardians wait in your passport until you connect one from the account menu, and then they&apos;re minted to it.</P>
        <P>How to collect a stamp is on the homepage: <Link href="/#how" className="font-bold underline">How it works</Link>.</P>
      </Panel>

      {/* Owners */}
      {/* EcoProof AI: the part of EcoProof that reads receipts and estimates products (2026-11-18) */}
      <Panel id="ai">
        <div className="mb-1 flex items-center gap-2"><Sparkles size={20} className="text-sage-700" /><H2>EcoProof AI: what the AI does</H2></div>
        <P>A stamp is only worth something if the impact behind it is real. EcoProof AI is the part of EcoProof that reads receipts and online orders. The numbers are not the shop&apos;s and not the AI&apos;s: they come from one short table that EcoProof keeps.</P>
        <H3>1. The shop says what it sells without plastic</H3>
        <P>An eco shop lists its plastic-free products by the name its receipts and orders print, and for each one says what kind of product it is (a reusable wrap, a soap bar, food in glass and so on), how it is packed, and how many pieces are in a pack. It declares that these are sold without plastic packaging. It never enters a number.</P>
        <H3>2. One table gives the numbers</H3>
        <P>Each kind of product has a fixed amount of <b>plastic avoided and CO₂ avoided, in grams</b>, counted once for each piece in the pack. A purchase is worth that amount, whichever shop sold it. No shop can change the table.</P>
        <H3>3. The AI fills the gaps, as an estimate</H3>
        <P>When a receipt or an order has a product the shop hasn&apos;t listed yet, the AI reads its kind off the name, the same table gives the numbers, and it counts as a single piece. That stamp is labelled an <b>EcoProof AI estimate</b>, and the product waits for the owner to confirm it or say it isn&apos;t plastic-free. The AI also reads the receipt photo itself.</P>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed">
          <li><b>Anyone can object.</b> Every listed product has a &ldquo;Not true?&rdquo; link on the shop&apos;s page. Two reports we confirm take the product off the list, and it stops counting.</li>
          <li><b>Rough averages, not audits.</b> The table is a first, cautious reading of what a product of that kind avoids. It is not certified lifecycle data, and we say so wherever the numbers appear.</li>
        </ul>
        <p className="mt-3 rounded-2xl bg-white/45 p-3 text-[12.5px] leading-relaxed ring-1 ring-white/70">
          In short: the shop declares, one table counts, the AI estimates what is missing, Solana proves.
        </p>
      </Panel>

      {/* How to help */}
      <Panel id="help">
        <div className="mb-1 flex items-center gap-2"><Heart size={20} className="text-sage-700" /><H2>How you can help EcoProof</H2></div>
        <P>EcoProof gets better with every eco place that joins, and the people who can do the most are the customers. A few small things make a big difference:</P>
        <ul className="mt-3 space-y-3 text-[14px] leading-relaxed">
          <li className="flex gap-3"><Coffee size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>Tell your local café, shop or market stall.</b> If they already skip plastic, they can set up their place in a few minutes and give their customers stamps. Send them the message below, or show them the <Link href="/join" className="font-bold underline">Run a place?</Link> page.</span></li>
          <li className="flex gap-3"><Package size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>Tell your favourite eco online store.</b> Webshops can put a stamp QR in their order email (WooCommerce) or a card in every parcel, on any channel. Ask them to look at the &ldquo;selling online&rdquo; section above.</span></li>
          <li className="flex gap-3"><Share2 size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>Share your passport.</b> Every share shows your friends that being eco can be proven, and sends them to the brands you stamped.</span></li>
          <li className="flex gap-3"><Flag size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>Report places that aren&apos;t eco.</b> Real reports from real visitors keep the map honest. See the <Link href="/rules" className="font-bold underline">eco rules</Link>.</span></li>
          <li className="flex gap-3"><Gift size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>Collect stamps where you shop.</b> Each scan is a small vote for the places that do the right thing.</span></li>
        </ul>
        <H3>Ask a shop to join</H3>
        <InviteShop />
      </Panel>

      {/* Proof */}
      <Panel id="proof">
        <div className="mb-1 flex items-center gap-2"><ShieldCheck size={20} className="text-sage-700" /><H2>How the proof works</H2></div>
        <P>Every valid stamp writes a short, public record to the <b>Solana</b> blockchain: a fingerprint of the stamp. Nobody, including us, can change it afterwards. Each stamp page has a <b>Verify</b> button that re-checks the data against the blockchain.</P>
        <P>Solana also makes &ldquo;once only&rdquo; unbreakable: every card, order and daily counter scan maps to a single address on Solana that can be created only once. A second attempt simply fails, even if two people try at the same moment.</P>
        <p className="mt-3 rounded-2xl bg-white/45 p-3 text-[12.5px] leading-relaxed ring-1 ring-white/70">
          <b>Honest limits.</b> A counter QR proves someone scanned it, and a determined person can fake their location. Only a verified purchase proves an order happened. Impact numbers are estimates from a transparent table, not audited lifecycle data. &ldquo;Verified&rdquo; on the map means a place has claimed and set itself up, not that we have inspected it. <span id="test-network" className="scroll-mt-24"><b>Test network.</b></span> EcoProof is in its test phase, so everything is written to Solana&apos;s test network (called devnet), not its main network yet. Every record is public and can be checked today, but a test network can be reset, so the promise that a record stays forever only holds from launch, when new records go to the main network. Until then the NFTs have no cash value and may not show in every wallet.
        </p>
      </Panel>


      <div className="flex flex-wrap justify-center gap-2 pb-2">
        <Link href="/passport" className="rounded-full bg-honey-500 px-5 py-3 text-[14px] font-bold text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] ring-1 ring-white/60">Go to my passport</Link>
        <Link href="/join" className="rounded-full bg-white/70 px-5 py-3 text-[14px] font-bold ring-1 ring-cocoa/10">Add my place</Link>
      </div>
      <p className="pb-2 text-center text-[11px] text-ink/60"><Check size={11} className="mr-1 inline" /><Camera size={11} className="mr-1 inline" /><Wallet size={11} className="mr-1 inline" />Every stamp is anchored on Solana. · <Link href="/privacy" className="underline">Privacy</Link></p>
    </div>
      </main>
    </div>
  );
}
