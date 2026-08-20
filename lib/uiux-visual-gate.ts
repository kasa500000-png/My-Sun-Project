import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

export async function assertUiuxVisualAccess() {
  const enabled = process.env.UIUX_VISUAL_TEST === "true";
  const expectedToken = process.env.UIUX_VISUAL_TOKEN;
  const headerStore = await headers();
  const suppliedToken = headerStore.get("x-uiux-visual-token");

  if (!enabled || !expectedToken || suppliedToken !== expectedToken) {
    notFound();
  }
}
