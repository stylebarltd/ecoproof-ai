import Link from "next/link";
import { Check, Camera, Coffee, Flag, Gift, Heart, MapPin, Package, QrCode, Share2, ShieldCheck, Smartphone, Store, Wallet } from "lucide-react";
import { artSvg } from "@/lib/nftArt";
import { POINTS_PRESENCE, POINTS_VERIFIED } from "@/lib/stampClasses";
import InviteShop from "@/components/InviteShop";

export const metadata = {
  title: "How EcoProof works",
  description: "Collect eco stamps, earn soulbound Eco Warrior NFTs, and prove it on Solana. A guide for customers and for shops.",
};

const art = (milestone: number) => `data:image/svg+xml;utf8,${encodeURIComponent(artSvg({ milestone, proofs: milestone, plasticItems: 0, co2Kg: 0, brand: "", seed: `about-${milestone}` }))}`;

const Panel = ({ id, className = "", children }: { id?: string; className?: string; children: React.ReactNode }) => (
  <section id={id} className={`glass scroll-mt-24 rounded-[28px] p-5 ${className}`}>{children}</section>
);
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 text-[20px] leading-tight">{children}</h2>;
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mb-1 mt-4 text-[15px] leading-tight">{children}</h3>;
const P = ({ children }: { children: React.ReactNode }) => <p className="text-[14px] leading-relaxed text-ink/90">{children}</p>;

function Steps({ items }: { items: { title: string; body: React.ReactNode }[] }) {
  return (
    <ol className="mt-3 space-y-3">
      {items.map((s, i) => (
        <li key={s.title} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-honey-500 text-[13px] font-extrabold text-ink ring-2 ring-white/70">{i + 1}</span>
          <span className="min-w-0 text-[14px] leading-relaxed"><b className="font-bold">{s.title}</b> <span className="text-ink/90">{s.body}</span></span>
        </li>
      ))}
    </ol>
  );
}

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
    <div className="space-y-4">
      <div className="passport-bg fixed inset-0 -z-10" aria-hidden />

      {/* Hero */}
      <header className="pt-1 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-honey-700">Welcome to EcoProof</p>
        <h1 className="mt-1 text-[30px] leading-[1.05]">&ldquo;I&apos;m eco, and I have proof.&rdquo;</h1>
        <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink/90">
          EcoProof turns your real eco-friendly choices into <b>stamps</b> in a personal eco passport. Every stamp is proven on the Solana blockchain, and collecting enough of them unlocks a collectible <b>Eco Warrior NFT</b> that only you can own.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/" className="rounded-full bg-honey-500 px-4 py-2.5 text-[14px] font-bold text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] ring-1 ring-white/60">My passport</Link>
          <Link href="/map" className="glass rounded-full px-4 py-2.5 text-[14px] font-bold">Find places</Link>
        </div>
      </header>

      {/* In-page navigation */}
      <nav aria-label="On this page" className="flex flex-wrap justify-center gap-2 py-1 text-[12px] font-bold">
        {[["#idea", "The idea"], ["#customers", "For customers"], ["#points", "Points & ranks"], ["#owners", "For shops"], ["#help", "Help out"], ["#proof", "The proof"], ["#faq", "Questions"]].map(([href, label]) => (
          <a key={href} href={href} className="glass rounded-full px-3.5 py-1.5">{label}</a>
        ))}
      </nav>

      {/* The idea */}
      <Panel id="idea">
        <H2>The idea in one minute</H2>
        <P>Lots of people choose reusable, plastic-free and local, but they have nothing to show for it. And brands doing the real work get drowned out by ones that only <i>claim</i> to be green.</P>
        <P>EcoProof connects the two. A customer scans a QR code or taps a link after an eco choice, and a stamp from that shop, café or brand lands in their passport. The stamp is recorded on Solana, so it can&apos;t be edited or used twice. People share their passport because it looks good and it&apos;s true, and that sharing is the most credible marketing a sustainable brand can get.</P>
        <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[11.5px] font-bold leading-tight">
          {[[QrCode, "Scan", "a QR or tap a link"], [Gift, "Collect", "a stamp in your passport"], [ShieldCheck, "Unlock", "an Eco Warrior NFT"]].map(([Icon, t, s]) => {
            const I = Icon as typeof QrCode;
            return <li key={t as string} className="rounded-2xl bg-white/50 px-2 py-3 ring-1 ring-white/70"><I size={22} strokeWidth={2.4} className="mx-auto mb-1 text-sage-700" />{t as string}<span className="mt-0.5 block text-[10.5px] font-semibold text-ink/70">{s as string}</span></li>;
          })}
        </ul>
      </Panel>

      {/* Customers */}
      <Panel id="customers">
        <div className="mb-1 flex items-center gap-2"><Smartphone size={20} className="text-sage-700" /><H2>For customers</H2></div>
        <H3>1. Your eco passport</H3>
        <P>The first screen of the app is your passport: your Eco Warrior NFTs, the stamps you&apos;ve collected, your progress to the next rank, and a trail of proofs. You don&apos;t need an account or a wallet to start. Your passport lives on your device until you connect a wallet (see below).</P>

        <H3>2. Collect a stamp</H3>
        <P>There are three ways, and they all end the same way, with a stamp and a proof on Solana:</P>
        <ul className="mt-2 space-y-2.5 text-[14px] leading-relaxed">
          <li className="flex gap-3"><Store size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>At a shop or café:</b> scan the EcoProof QR code on the counter. Tap <b>Scan a QR to collect a stamp</b> in the app, or use your phone&apos;s own camera. One stamp per place per day. Some places check that you are really there and will ask for your location.</span></li>
          <li className="flex gap-3"><Package size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>A card in your parcel:</b> brands that sell online (even on marketplaces) can put a card in the box. Scan it. Each card works once.</span></li>
          <li className="flex gap-3"><Gift size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>From an order email:</b> if a shop that uses EcoProof sends you an &ldquo;order completed&rdquo; email, it contains a personal QR and a <b>Collect my stamp</b> button. Tap it. This is the special one, see below.</span></li>
        </ul>
        <p className="mt-3 rounded-2xl bg-white/45 p-3 text-[12.5px] leading-relaxed ring-1 ring-white/70">
          <b>Just trying it out?</b> The demo places (Demo Café, Demo Restaurant and Demo Coffee Roasters) can be collected by tapping them in your passport or on the map. Real places can only be collected by scanning their QR code.
        </p>

        <H3>3. Two kinds of stamp</H3>
        <div className="mt-2 grid gap-3">
          <div className="relative rounded-2xl bg-gradient-to-br from-honey-300/60 via-white/70 to-honey-300/30 p-3.5 ring-2 ring-honey-400 shadow-[0_10px_28px_rgba(232,163,23,0.4)]">
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-honey-700">Verified purchase <span className="rounded-full bg-honey-500 px-1.5 py-0.5 text-[9px] text-ink">+{POINTS_VERIFIED} pts</span></span>
            <p className="mt-1 font-heading text-[16px]">Green Goods Co. <span className="font-sans text-[11px] font-semibold text-ink/60">(example online shop)</span></p>
            <p className="text-[12.5px] font-bold">110 single-use plastics avoided · 4.5 kg CO₂ saved</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink/80">Comes from a real online order. Because the shop tells us what was in it, the stamp shows the real impact of your purchase. Worth <b>{POINTS_VERIFIED} points</b>.</p>
          </div>
          <div className="rounded-2xl bg-white/45 p-3.5 ring-1 ring-white/70">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sage-800">Presence stamp <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[9px]">+{POINTS_PRESENCE} pt</span></span>
            <p className="mt-1 font-heading text-[16px]">Demo Café</p>
            <p className="text-[12.5px] leading-snug text-ink/80">Comes from a counter QR or a parcel card. It proves you were there or that you received the parcel, nothing about what was bought, so there is no impact number. Worth <b>{POINTS_PRESENCE} point</b>.</p>
          </div>
        </div>
        <P>Both kinds live in the same passport.</P>

        <H3>4. Connect a wallet to keep your NFTs</H3>
        <P>You can collect stamps without a wallet. To <b>receive your NFTs</b> and keep your passport on every device, tap <b>Connect wallet</b>. Phantom and Solflare both work. You only sign a short free message: no fee, no funds move, and we never see your keys. On a phone, the wallet app opens, you approve, and it brings you back. Anything you collected before connecting is added to your wallet passport.</P>

        <H3>5. Share it, find places, report problems</H3>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed">
          <li><b>Share:</b> the <b>Share my passport</b> button makes a ready-to-post image and caption for Telegram, X, Facebook, WhatsApp and Instagram, with a link back to your live passport.</li>
          <li><b>Map:</b> <MapPin size={14} className="inline text-sage-700" /> the <Link href="/map" className="font-bold underline">Map</Link> shows every place that has joined EcoProof.</li>
          <li><b>Report:</b> if a place isn&apos;t eco (plastic cups, plastic cutlery, greenwashing), tap <b>Report this place</b>. Read the <Link href="/rules" className="font-bold underline">eco rules</Link>.</li>
        </ul>
      </Panel>

      {/* Points and ranks */}
      <Panel id="points">
        <H2>Points and ranks</H2>
        <P>Ranks are reached by <b>points</b>, not by how many times you scan: a verified purchase is worth {POINTS_VERIFIED}, a presence stamp {POINTS_PRESENCE}. Every stamp records a proof on Solana, but only reaching a rank mints an NFT.</P>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[[1, "Seedling", "1 point"], [3, "Sprout", "3 points"], [10, "Guardian", "10 points"], [25, "Legend", "25 points, then every 50"]].map(([m, name, pts]) => (
            <div key={m as number} className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art(m as number)} alt={`${name} Eco Warrior`} width={512} height={512} className="aspect-square w-full rounded-3xl ring-2 ring-white/80 shadow-md" />
              <p className="mt-1.5 font-heading text-[15px] leading-none">{name as string}</p>
              <p className="text-[11px] font-semibold text-ink/70">{pts as string}</p>
            </div>
          ))}
        </div>
        <P>The Eco Warriors are <b>soulbound</b>: they are minted to your wallet and can&apos;t be sold or transferred. They can only be earned. Each one is drawn from your wallet address, so your warrior looks like you and grows up as you level. One verified purchase is worth 5 points, so it can unlock the first two ranks at once.</P>
      </Panel>

      {/* Owners */}
      <Panel id="owners">
        <div className="mb-1 flex items-center gap-2"><Store size={20} className="text-sage-700" /><H2>For shops, cafés and brands</H2></div>
        <P>EcoProof is free marketing built on proof. Your customers get a stamp with your logo on it, and when they share their passport, your name goes with it. The reward is the NFT, not a discount, so it never costs you margin. You don&apos;t need an app, a till integration or any code to start.</P>

        <H3>Who can join</H3>
        <P>Only places that are genuinely eco. You confirm the <Link href="/rules" className="font-bold underline">eco rules</Link> when you join: no drinks in single-use plastic, no plastic straws, cutlery or takeaway containers, and genuinely eco-minded. We don&apos;t inspect places in person yet, so we rely on honesty and on customers: anyone can report a place, and a place with enough reports from real visitors is paused until we&apos;ve looked at it.</P>

        <H3>Set up a shop or café in a few minutes</H3>
        <Steps items={[
          { title: "Connect your wallet.", body: <>It&apos;s how you sign in as the owner. Free signature, no funds.</> },
          { title: "Open Set up a place.", body: <>Go to <Link href="/join" className="font-bold underline">Run a place?</Link> from the map. Enter your name, whether you&apos;re a shop, café, restaurant, market stall or online shop, a one-line tagline, and upload your logo.</> },
          { title: "Add your location.", body: <>Physical places share their location while standing in the shop. It puts you on the map, and stamps are only given to people who are really there (a GPS check, always on).</> },
          { title: "Print your QR.", body: <>You get your stamp, your QR code and a print-ready counter card. Put it where customers can scan it. One stamp per customer per day.</> },
        ]} />

        <H3>Selling online? Two ways to give stamps</H3>
        <ul className="mt-1 space-y-2.5 text-[14px] leading-relaxed">
          <li className="flex gap-3"><Gift size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>A. A QR in your order email (WooCommerce).</b> We give you a webhook and a small snippet for your shop. When an order is completed, the customer&apos;s email carries a personal QR. Their stamp becomes a <b>verified purchase</b> with the real impact of what they bought. Only this method can prove the order happened.</span></li>
          <li className="flex gap-3"><Package size={20} className="mt-0.5 shrink-0 text-sage-700" /><span><b>B. Printed cards in the parcel.</b> Generate cards in your dashboard, print them and drop one in each parcel. It works on any channel, including Amazon, Lazada and Shopee, and needs nothing from the shop. It gives a presence stamp, with no impact number.</span></li>
        </ul>
        <P>You can use both. All the steps and the snippet are in the Run a place? page, under your online shop.</P>

        <H3>What happens afterwards</H3>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed">
          <li>Your stamp, with your logo, appears in customers&apos; passports and on the EcoProof map.</li>
          <li>Customers share their passport, and your brand travels with it.</li>
          <li>If a place is reported, it can be paused. Stamps already collected stay in passports and their proofs are untouched.</li>
        </ul>
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
          <b>Honest limits.</b> A counter QR proves someone scanned it, and a determined person can fake their location. Only a verified purchase proves an order happened. Impact numbers are estimates from a transparent table, not audited lifecycle data. &ldquo;Verified&rdquo; on the map means a place has claimed and set itself up, not that we have inspected it. Everything currently runs on Solana&apos;s <b>devnet</b> test network, so the NFTs have no cash value and may not show in every wallet.
        </p>
      </Panel>

      {/* FAQ */}
      <Panel id="faq" className="space-y-2">
        <H2>Questions</H2>
        <Faq q="Do I need a wallet?">No, you can collect stamps without one. You need a wallet (Phantom or Solflare) to receive your Eco Warrior NFTs and to keep your passport on other devices.</Faq>
        <Faq q="Does it cost anything?">No. EcoProof is free, connecting a wallet costs nothing, and you never pay a network fee.</Faq>
        <Faq q="I can't collect a stamp from my passport. Why?">At real places a stamp is collected by scanning the place&apos;s QR code, so it can only be done there. Tap <b>Scan a QR to collect a stamp</b> or use your camera. The demo places can be tapped.</Faq>
        <Faq q="It says I already collected a stamp today.">A place gives one stamp per person per day. Come back tomorrow. Parcel cards and orders work once each.</Faq>
        <Faq q="Why does it ask for my location?">Places set up by their owners check that you are really there. Your location is used for that check only.</Faq>
        <Faq q="The camera doesn't open inside my wallet app.">Wallet apps often block the camera in their built-in browser. Open EcoProof in Safari or Chrome instead, or point your phone&apos;s own camera app at the QR code. Connecting your wallet from Safari or Chrome works too: the wallet app opens and brings you back.</Faq>
        <Faq q="What data do you keep?">Your passport (a device ID or your wallet address) and your stamps. For online orders we keep only the order number and the products and quantities, never names, emails, addresses or prices.</Faq>
        <Faq q="What if I lose my phone?">If you connected a wallet, sign in with it on the new device and your passport is back. A passport that was never linked to a wallet stays on the old device.</Faq>
        <Faq q="I run a shop. How do I join?">Open <Link href="/join" className="font-bold underline">Run a place?</Link>, connect your wallet and follow the steps. Read the <Link href="/rules" className="font-bold underline">eco rules</Link> first.</Faq>
      </Panel>

      <div className="flex flex-wrap justify-center gap-2 pb-2">
        <Link href="/" className="rounded-full bg-honey-500 px-5 py-3 text-[14px] font-bold text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] ring-1 ring-white/60">Go to my passport</Link>
        <Link href="/join" className="glass rounded-full px-5 py-3 text-[14px] font-bold">Set up my place</Link>
      </div>
      <p className="pb-2 text-center text-[11px] text-ink/60"><Check size={11} className="mr-1 inline" /><Camera size={11} className="mr-1 inline" /><Wallet size={11} className="mr-1 inline" />Every stamp is anchored on Solana.</p>
    </div>
  );
}
