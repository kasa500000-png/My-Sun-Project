import FitLogApp from "@/components/FitLogApp";
import { assertUiuxVisualAccess } from "@/lib/uiux-visual-gate";

export const dynamic = "force-dynamic";

export default async function UiuxVisualPage() {
  await assertUiuxVisualAccess();
  return <FitLogApp userEmail="uiux.visual@example.invalid" />;
}
