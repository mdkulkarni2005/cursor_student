import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { AttentionWorkspace } from "@/components/transformer/attention-workspace";

export default async function TransformerVisualizerPage() {
  const user = await requireOnboardedUser();

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Artificial Intelligence &amp; Machine Learning</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Transformer Attention Visualizer</h1>
          <p className="mt-1 text-[13px] text-soft">
            Type any sentence and watch real scaled dot-product self-attention compute live, token by token, head by head.
          </p>
        </div>

        <AttentionWorkspace />
      </div>
    </AppShell>
  );
}
