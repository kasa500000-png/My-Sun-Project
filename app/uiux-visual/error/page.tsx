import { assertUiuxVisualAccess } from "@/lib/uiux-visual-gate";

export const dynamic = "force-dynamic";

export default async function UiuxVisualErrorPage() {
  await assertUiuxVisualAccess();
  throw new Error("UIUX_VISUAL_TEST_ERROR");
}
