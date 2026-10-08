import { handle } from "hono/vercel";
import app from "@/server/api/app";

const handler = handle(app);
export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
