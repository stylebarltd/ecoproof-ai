import { getPlace, toPublic } from "@/lib/stampPlaces";
import { getOrder, verifyToken } from "@/lib/woo";
import ClaimStamp from "@/components/ClaimStamp";

export const dynamic = "force-dynamic";

const Msg = ({ title, body }: { title: string; body: string }) => <div className="pt-16 text-center"><h1 className="text-2xl">{title}</h1><p className="mt-2 text-sm text-neutral-600">{body}</p></div>;

/** Landing page of the signed link / QR in a shop's order email. */
export default async function OrderClaim({ params }: { params: Promise<{ place: string; token: string }> }) {
  const { place: placeId, token } = await params;
  const place = await getPlace(placeId);
  const orderId = place ? verifyToken(place.secret, placeId, token) : null;
  if (!place || !orderId) return <Msg title="This link isn't valid" body="Open the link from your order email again." />;
  const order = await getOrder(placeId, orderId);
  if (order?.claimed_at) return <Msg title="This order has been claimed" body="Each order gives one stamp, once." />;
  if (order && order.status !== "valid") return <Msg title="This order can't be claimed" body="It was cancelled or refunded." />;
  return <ClaimStamp place={toPublic(place)} orderToken={token} orderLine={order?.line ?? null} />;
}
