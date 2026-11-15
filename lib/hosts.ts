/** The app's one public address. Production always hands out links on this host (QR codes, cards, order links, webhooks,
 *  NFT metadata, auth), whatever APP_URL says: the domain is not a setting. Previews use their branch URL, local dev APP_URL
 *  or localhost. The old host ecoproof.superbee.me keeps answering for everything printed or installed before 2026-11-15. */
export const PRODUCTION_URL = "https://ecoproofai.com";
