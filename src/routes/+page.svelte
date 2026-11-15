<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import WeekSection from "$lib/components/WeekSection.svelte";
  import { formatDate } from "$lib/dates";

  let { data } = $props();
  let showPast = $state(false);
  let selected = $state<string | null>(null);

  const activeWeek = $derived(
    data.weeks.find((w) => w.key === selected) ??
      data.weeks.find((w) => w.isCurrent) ??
      data.weeks[0]
  );

  function onTabKey(e: KeyboardEvent, key: string) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = data.weeks.findIndex((w) => w.key === key) + step;
    const next = data.weeks[(i + data.weeks.length) % data.weeks.length];
    selected = next.key;
    document.getElementById(`tab-${next.key}`)?.focus();
  }

  const pending = $derived(
    [...data.weeks, ...data.pastWeeks].some((w) =>
      w.items.some((i) => i.pending)
    )
  );

  // Publisher/price details are fetched in the background; refresh until they have all arrived.
  $effect(() => {
    if (!pending) return;
    const timer = setInterval(() => void invalidateAll(), 6000);
    return () => clearInterval(timer);
  });
</script>

<svelte:head><title>Pull List · Mike's Pull List</title></svelte:head>

{#if !data.metronConfigured}
  <p class="panel notice">
    No Metron API token is set, so searching and release lookups are disabled.
    Add <code>METRON_API_TOKEN</code> to <code>.env</code> and restart.
  </p>
{/if}

{#if activeWeek}
  <div class="tabs" role="tablist" aria-label="Weeks">
    {#each data.weeks as week (week.key)}
      <button
        role="tab"
        id="tab-{week.key}"
        class="tab"
        aria-selected={week.key === activeWeek.key}
        aria-controls="panel-{week.key}"
        tabindex={week.key === activeWeek.key ? 0 : -1}
        onclick={() => (selected = week.key)}
        onkeydown={(e) => onTabKey(e, week.key)}
      >
        {formatDate(week.key)}
        {#if week.isCurrent}<span class="dot" title="This week"></span>{/if}
      </button>
    {/each}
  </div>

  <div
    role="tabpanel"
    id="panel-{activeWeek.key}"
    aria-labelledby="tab-{activeWeek.key}"
  >
    {#key activeWeek.key}
      <WeekSection week={activeWeek} taxRate={data.settings.taxRate} />
    {/key}
  </div>
{/if}

<section class="past">
  <button
    class="link"
    onclick={() => (showPast = !showPast)}
    aria-expanded={showPast}
  >
    {showPast ? "Hide" : "Show"} past weeks (kept for 30 days)
  </button>
  {#if showPast}
    {#each data.pastWeeks as week (week.key)}
      <WeekSection {week} taxRate={data.settings.taxRate} readonly />
    {:else}
      <p class="muted">No records from the past month.</p>
    {/each}
  {/if}
</section>

<style>
  .notice {
    padding: 1.2rem 1.6rem;
    margin-bottom: 2.4rem;
    border-color: var(--sk-bg-accent);
  }
  code {
    font-family: var(--sk-font-family-mono);
    font-size: 1.3rem;
    color: var(--sk-fg-1);
  }
  .tabs {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--sk-border);
    overflow-x: auto;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 1.6rem;
    margin-bottom: -1px;
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    color: var(--sk-fg-3);
    font: var(--sk-font-ui-medium);
    white-space: nowrap;
    cursor: pointer;
  }
  .tab:hover {
    color: var(--sk-fg-1);
  }
  .tab[aria-selected="true"] {
    color: var(--sk-fg-1);
    border-bottom-color: var(--sk-bg-accent);
  }
  .dot {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: var(--sk-fg-accent);
  }
  .past {
    display: grid;
    gap: 2rem;
    padding-top: 1rem;
  }
  .past button {
    justify-self: start;
  }
</style>
