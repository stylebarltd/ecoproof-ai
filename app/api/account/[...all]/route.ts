import { auth } from "@/lib/auth";

// Better Auth's own routes: Google and Facebook sign-in and their callbacks, linking accounts, signing out of sessions, deleting the account.
const handler = (req: Request) => auth().handler(req);
export { handler as GET, handler as POST };
