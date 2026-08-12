import { createMiddleware } from "@tanstack/react-start";
import { getSessionToken, SESSION_HEADER } from "./session-token";

/** Melampirkan token sesi pengurus ke setiap pemanggilan server function. */
export const attachPengurusSession = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = getSessionToken();
    return next({ headers: token ? { [SESSION_HEADER]: token } : {} });
  },
);
