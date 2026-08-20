import Loading from "@/app/loading";
import { assertUiuxVisualAccess } from "@/lib/uiux-visual-gate";

export const dynamic = "force-dynamic";

export default async function UiuxVisualLoadingPage() {
  await assertUiuxVisualAccess();
  return <Loading />;
}
