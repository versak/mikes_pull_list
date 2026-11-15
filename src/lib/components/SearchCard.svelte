<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { send } from "$lib/client/api";
  import { errorMessage, notify } from "$lib/client/toast.svelte";
  import { formatDate } from "$lib/dates";
  import { issueNumber, seriesLabel } from "$lib/format";
  import { formatMoney } from "$lib/money";
  import type { IssueDetailResponse, SearchIssue } from "$lib/types";

  let {
    issue = $bindable(),
    onSubscribed
  }: { issue: SearchIssue; onSubscribed: (seriesId: number) => void } =
    $props();

  let busy = $state(false);
  let detail = $state<IssueDetailResponse | null>(null);
  let showVariants = $state(false);

  async function refresh() {
    detail = await send<IssueDetailResponse>("GET", `/api/issues/${issue.id}`);
    issue = detail.issue;
  }

  async function run(action: () => Promise<unknown>) {
    busy = true;
    try {
      await action();
      void invalidateAll();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      busy = false;
    }
  }

  const pull = (variantKey: string | null = null) =>
    run(async () => {
      await send("POST", "/api/pulls", { issueId: issue.id, variantKey });
      await refresh();
      notify(
        `Pulled ${seriesLabel(issue.seriesName)} ${issueNumber(issue.number)}${variantKey ? " (variant)" : ""}.`
      );
    });

  const subscribe = () =>
    run(async () => {
      await send("POST", "/api/subscriptions", { issueId: issue.id });
      onSubscribed(issue.seriesId);
      notify(`Subscribed to ${seriesLabel(issue.seriesName)}.`);
      await refresh();
    });

  const toggleVariants = () =>
    run(async () => {
      if (!detail) await refresh();
      showVariants = !showVariants;
    });
</script>

<article class="card panel">
  <div class="main">
    {#if issue.image}
      <img
        src={issue.image}
        alt="Cover of {seriesLabel(issue.seriesName)} {issueNumber(
          issue.number
        )}"
        loading="lazy"
        width="90"
        height="135"
      />
    {:else}
      <div class="no-cover" aria-hidden="true">No cover</div>
    {/if}

    <div class="info">
      <h3>
        {seriesLabel(issue.seriesName)}
        <strong>{issueNumber(issue.number)}</strong>
      </h3>
      <dl>
        <dt>Release</dt>
        <dd>
          {issue.storeDate
            ? formatDate(issue.storeDate, { year: "numeric" })
            : "TBD"}
        </dd>
        <dt>Publisher</dt>
        <dd>{issue.publisher ?? "—"}</dd>
        <dt>Price</dt>
        <dd>{formatMoney(issue.priceCents)}</dd>
      </dl>

      <div class="badges">
        {#if issue.pulledCopies}<span class="badge"
            >Pulled × {issue.pulledCopies}</span
          >{/if}
        {#if issue.subscribed}<span class="badge sub">Subscribed</span>{/if}
      </div>

      <div class="actions">
        <button
          class="primary"
          disabled={busy || !issue.storeDate || issue.subscribed}
          onclick={() => pull()}>Pull Issue</button
        >
        <button disabled={busy || issue.subscribed} onclick={subscribe}
          >{issue.subscribed ? "Subscribed" : "Subscribe"}</button
        >
        <button
          class="link"
          disabled={busy}
          onclick={toggleVariants}
          aria-expanded={showVariants}
        >
          {showVariants ? "Hide variants" : "Variants"}
        </button>
      </div>
    </div>
  </div>

  {#if showVariants && detail}
    <div class="variants">
      {#if detail.variants.length === 0}
        <p class="muted">No variant covers listed for this issue.</p>
      {:else}
        <ul>
          {#each detail.variants as variant (variant.key)}
            <li>
              {#if variant.image}
                <img
                  src={variant.image}
                  alt="Variant cover: {variant.name}"
                  loading="lazy"
                  width="45"
                  height="68"
                />
              {:else}
                <div class="no-cover small" aria-hidden="true"></div>
              {/if}
              <div class="v-info">
                <span>{variant.name}</span>
                <span class="muted">{formatMoney(variant.priceCents)}</span>
                {#if variant.pulledCopies}<span class="badge"
                    >Pulled × {variant.pulledCopies}</span
                  >{/if}
              </div>
              <button disabled={busy} onclick={() => pull(variant.key)}
                >Pull</button
              >
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</article>

<style>
  .card {
    padding: 1.2rem;
    display: grid;
    gap: 1.2rem;
    align-content: start;
  }
  .main {
    display: flex;
    gap: 1.4rem;
  }
  img,
  .no-cover {
    flex: none;
    width: 9rem;
    height: 13.5rem;
    object-fit: cover;
    border-radius: 0.4rem;
    background: var(--sk-bg-0);
  }
  .no-cover {
    display: grid;
    place-items: center;
    font: var(--sk-font-ui-small);
    color: var(--sk-fg-4);
    border: 1px dashed var(--sk-border);
  }
  .info {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  h3 {
    margin: 0;
    font: var(--sk-font-ui-medium);
    font-weight: 500;
    line-height: 1.3;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.1rem 1rem;
    margin: 0;
    font-size: 1.3rem;
  }
  dt {
    color: var(--sk-fg-4);
  }
  dd {
    margin: 0;
    color: var(--sk-fg-1);
  }
  .badges {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .badge {
    font: var(--sk-font-ui-small);
    font-size: 1.2rem;
    padding: 0.1rem 0.8rem;
    border-radius: 10rem;
    border: 1px solid var(--sk-border);
    color: var(--sk-fg-3);
  }
  .badge.sub {
    color: var(--sk-fg-accent);
    border-color: var(--sk-bg-accent);
  }
  .actions {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
    align-items: center;
    margin-top: auto;
  }
  .variants {
    border-top: 1px solid var(--sk-border);
    padding-top: 1.2rem;
  }
  .variants ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.8rem;
  }
  .variants li {
    display: flex;
    align-items: center;
    gap: 1.2rem;
  }
  .variants img,
  .no-cover.small {
    width: 4.5rem;
    height: 6.8rem;
  }
  .v-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    align-items: center;
    font-size: 1.4rem;
    color: var(--sk-fg-1);
  }
</style>
