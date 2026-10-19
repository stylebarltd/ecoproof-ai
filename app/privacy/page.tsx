import Link from "next/link";

export const metadata = {
  title: "Privacy | EcoProof",
  description: "What EcoProof collects, why, who it is shared with, what goes on the Solana blockchain, and your rights under Thailand's PDPA.",
};

const PRIVACY_EMAIL = "privacy@superbee.me";
const UPDATED = "18 October 2026";

const H2 = ({ id, children }: { id?: string; children: React.ReactNode }) => <h2 id={id} className="scroll-mt-20 pt-2 text-[17px]">{children}</h2>;
const Mail = () => <a href={`mailto:${PRIVACY_EMAIL}`} className="font-bold underline">{PRIVACY_EMAIL}</a>;

export default function Privacy() {
  return (
    <div className="space-y-4 text-sm leading-relaxed lg:mx-auto lg:max-w-[720px]">
      <h1 className="text-[22px] leading-tight">Privacy</h1>
      <p className="text-xs text-neutral-600">Last updated {UPDATED}</p>
      <p>
        EcoProof is run by <b>SuperBee</b> in Thailand. We are the data controller for the personal data described here, under Thailand&apos;s
        Personal Data Protection Act (PDPA). This page explains it in plain language. Questions or requests: <Mail />.
      </p>

      <div className="space-y-1.5 rounded-2xl bg-cream p-3">
        <p className="font-semibold">The short version</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>You can collect stamps without an account. Then we only know a random ID stored in your browser.</li>
          <li>Signing in with Google or Facebook gives us your name, email and profile picture. Signing in with a wallet gives us only its public address.</li>
          <li>Your location is used once, to check you are at a place when you collect its stamp. We don&apos;t store it.</li>
          <li>Each stamp&apos;s proof on Solana is a fingerprint (a hash): it contains no name, email or location.</li>
          <li>No ads, no tracking or analytics tools, and we never sell your data.</li>
        </ul>
      </div>

      <H2>What we collect, and why</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <b>Your passport.</b> Without an account, a random ID is created in your browser and keeps your passport. With each stamp we store the
          place, the date and time, how it was collected (QR code, printed card or online order) and the points it earns. We need this to run your
          passport and to stop the same stamp being collected twice.
        </li>
        <li>
          <b>Online orders.</b> When a shop connects its online store, it sends us the order number, the products and quantities, and we work out
          their eco impact. Shops never send us your name, email, address, payment details or prices.
        </li>
        <li>
          <b>Location.</b> A place on the map only gives its stamp to people who are there. When you collect one, your browser asks to share your
          location; we compare it with the place&apos;s location and then discard it. &ldquo;Show distances&rdquo; on the map works in your browser and
          sends nothing to us.
        </li>
        <li>
          <b>Your account, if you sign in.</b> With Google or Facebook: your name, email address (if the account has one), profile picture and
          account ID there. With a Solana
          wallet: its public address (you sign a free message to prove it is yours; we never see your keys). While you are signed in we keep a
          session with your IP address and browser type, so you can see and end sessions and we can spot misuse.
        </li>
        <li>
          <b>Shops.</b> If you set up a place: its name, tagline, logo, location, the account that owns it, and the order data described above.
        </li>
        <li>
          <b>Reports.</b> If you report a place: the reason, anything you write, and your passport ID, so each person counts once. Reports are
          never shown to the place.
        </li>
        <li>
          <b>Security.</b> Our hosting keeps short-lived technical logs, and we use IP addresses briefly to limit repeated requests.
        </li>
      </ul>
      <p>
        Under the PDPA we rely on: providing the service you asked for (your passport, stamps, account and shop), our legitimate interest in
        keeping it fair and secure (the location check, duplicate and misuse checks), and your consent where we ask for it (sharing your
        location, signing in with Google or Facebook). You can withdraw consent at any time; it doesn&apos;t affect what was done before.
      </p>

      <H2>What is public on the blockchain</H2>
      <p>
        Stamps are anchored on the Solana blockchain (currently its test network, devnet) so anyone can check them. Each proof holds only a
        fingerprint of the stamp record, which can&apos;t be turned back into your data. Bee Guardian NFTs are minted to your wallet, and like
        everything on Solana they are public together with that wallet address, including the points and impact figures shown on them.
        <b> Nothing written to a blockchain can be changed or deleted, by us or anyone else.</b> That is why we put no names, emails or
        locations there.
      </p>

      <H2>Sharing your passport</H2>
      <p>
        If you share your passport, anyone with the link sees your stamps, points and Bee Guardians. Share links use a separate public ID, never
        your browser ID or your email.
      </p>

      <H2>Who else handles your data</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li><b>Vercel</b> runs the website, and <b>Neon</b> runs our database. Both store data in the United States.</li>
        <li><b>Google</b> or <b>Meta</b> (Facebook), only if you choose to sign in with them.</li>
        <li><b>Anthropic</b> (AI) estimates what a shop&apos;s products replace, from product names and descriptions. No customer data is sent.</li>
        <li><b>Solana</b> network nodes receive the proofs and NFTs described above.</li>
        <li><b>OpenStreetMap</b> supplies the map images. Your browser loads them directly, so OpenStreetMap sees your IP address.</li>
        <li><b>Phantom</b> or <b>Solflare</b>, if you use their wallet apps. Their own privacy policies apply.</li>
      </ul>
      <p>
        Because our hosting and database are in the United States, your data is transferred outside Thailand. We only use providers that
        protect it with appropriate safeguards, as the PDPA requires. We never sell personal data or share it for advertising.
      </p>

      <H2>Cookies and storage on your device</H2>
      <p>
        We use one cookie to keep you signed in. Your browser also stores your guest passport ID and a few settings (for example a sign-in in
        progress). There are no advertising or analytics cookies.
      </p>

      <H2>How long we keep it</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Account details: until you delete your account. Sign-in sessions end after 30 days.</li>
        <li>
          Stamp records: they are what the proofs on Solana point to, so we keep them. When you delete your account we remove your name, email,
          sign-in methods and sessions, and your stamps are no longer connected to you.
        </li>
        <li>Shop details: until the place is removed. Reports: as long as needed to review them.</li>
      </ul>

      {/* Meta asks for a data deletion instructions URL for Facebook sign-in: /privacy#your-rights */}
      <H2 id="your-rights">Your rights</H2>
      <p>
        Under the PDPA you can ask to see a copy of your data, correct it, delete it, receive it in a usable format, object to or limit how we
        use it, and withdraw consent. You can delete your account yourself from the account menu (<b>Delete account</b>). For anything else,
        email <Mail /> and we will answer within 30 days. We can&apos;t delete what is on the blockchain, as explained above. If you are unhappy
        with how we handle your data, you can complain to Thailand&apos;s Office of the Personal Data Protection Committee (PDPC).
      </p>

      <H2>Children</H2>
      <p>
        EcoProof is not meant for children under 10. Under the PDPA, if you are under 20 you need a parent&apos;s or guardian&apos;s agreement to
        sign in with an account.
      </p>

      <H2>Changes</H2>
      <p>If we change how we use your data, we will update this page and the date at the top. For important changes we will tell you in the app.</p>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/" className="rounded-full bg-sage-500 px-4 py-2 font-bold text-cream">Back to my passport</Link>
        <Link href="/about" className="rounded-full border-[1.5px] border-neutral-300 px-4 py-2 font-bold">How EcoProof works</Link>
      </div>
    </div>
  );
}
