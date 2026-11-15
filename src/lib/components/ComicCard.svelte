<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { send } from "$lib/client/api";
  import { errorMessage, notify } from "$lib/client/toast.svelte";
  import { formatDate } from "$lib/dates";
  import { issueNumber, seriesLabel } from "$lib/format";
  import { formatMoney } from "$lib/money";
  import type { PullItem } from "$lib/types";

  let { item, readonly = false }: { item: PullItem; readonly?: boolean } =
    $props();
  let busy = $state(false);

  async function run(action: () => Promise<unknown>) {
    busy = true;
    try {
      await action();
      await invalidateAll();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      busy = false;
    }
  }

  function setCopies(copies: number) {
    if (copies < 1) return;
    void run(() =>
      item.source === "subscription"
        ? send("PATCH", `/api/subscriptions/${item.seriesId}`, { copies })
        : send("PATCH", "/api/pulls", {
            issueId: item.issueId,
            variantKey: item.variantKey,
            copies
          })
    );
  }

  function remove() {
    void run(() =>
      send("DELETE", "/api/pulls", {
        issueId: item.issueId,
        variantKey: item.variantKey
      })
    );
  }

  function unsubscribe() {
    if (
      !confirm(
        `Unsubscribe from ${seriesLabel(item.seriesName)}? It will be removed from all upcoming pull lists.`
      )
    )
      return;
    void run(() => send("DELETE", `/api/subscriptions/${item.seriesId}`));
  }
</script>

<article class="card panel" class:busy>
  {#if item.image}
    <img
      src={item.image}
      alt="Cover of {seriesLabel(item.seriesName)} {issueNumber(item.number)}"
      loading="lazy"
      width="90"
      height="135"
    />
  {:else}
    <div class="no-cover" aria-hidden="true">No cover</div>
  {/if}

  <div class="info">
    <h3>{seriesLabel(item.seriesName)} {issueNumber(item.number)}</h3>
    {#if item.variantName}<p class="variant">
        Variant: {item.variantName}
      </p>{/if}
    <dl>
      <dt>Publisher</dt>
      <dd>{item.publisher ?? (item.pending ? "Loading…" : "—")}</dd>
      <dt>Price</dt>
      <dd>
        {item.priceCents == null && item.pending
          ? "Loading…"
          : formatMoney(item.priceCents)}
      </dd>
    </dl>

    <div class="footer">
      <span class="badge" class:sub={item.source === "subscription"}>
        {item.source === "subscription" ? "Subscribed" : "Single issue"}
      </span>

      {#if readonly}
        <span class="copies-static">× {item.copies}</span>
      {:else}
        <div class="stepper" role="group" aria-label="Copies">
          <button
            type="button"
            aria-label="Fewer copies"
            disabled={busy || item.copies <= 1}
            onclick={() => setCopies(item.copies - 1)}>−</button
          >
          <output aria-live="polite">{item.copies}</output>
          <button
            type="button"
            aria-label="More copies"
            disabled={busy || item.copies >= 99}
            onclick={() => setCopies(item.copies + 1)}>+</button
          >
        </div>
      {/if}
    </div>

    {#if !readonly}
      <div class="actions">
        {#if item.source === "subscription"}
          <button
            class="link"
            type="button"
            disabled={busy}
            onclick={unsubscribe}>Unsubscribe</button
          >
        {:else}
          <button class="link" type="button" disabled={busy} onclick={remove}
            >Remove</button
          >
        {/if}
      </div>
    {/if}
  </div>
</article>

<style>
  .card {
    display: flex;
    gap: 1.4rem;
    padding: 1.2rem;
  }
  .card.busy {
    opacity: 0.7;
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
  }
  h3 {
    margin: 0;
    font: var(--sk-font-ui-medium);
    font-weight: 500;
    line-height: 1.3;
  }
  .variant {
    margin: 0.2rem 0 0;
    font-size: 1.4rem;
    color: var(--sk-fg-accent);
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.1rem 1rem;
    margin: 0.8rem 0;
    font-size: 1.3rem;
  }
  dt {
    color: var(--sk-fg-4);
  }
  dd {
    margin: 0;
    color: var(--sk-fg-1);
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: auto;
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
  .stepper {
    display: flex;
    align-items: center;
    border: 1px solid var(--sk-border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .stepper button {
    border: none;
    border-radius: 0;
    width: 3rem;
    padding: 0.3rem 0;
    font-size: 1.8rem;
    line-height: 1;
  }
  .stepper output {
    min-width: 3rem;
    text-align: center;
    color: var(--sk-fg-1);
    font-family: var(--sk-font-family-mono);
  }
  .copies-static {
    font-family: var(--sk-font-family-mono);
    color: var(--sk-fg-1);
  }
  .actions {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin-top: 0.6rem;
  }
</style>
