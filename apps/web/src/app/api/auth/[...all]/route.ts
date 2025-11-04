import { getSession } from "@/utils/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(getSession.handler);
