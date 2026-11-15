<script lang="ts">
  import { formatDate } from "$lib/dates";
  import { computeTotals, formatMoney, PULLBOX_DISCOUNT } from "$lib/money";
  import type { WeekView } from "$lib/types";
  import ComicCard from "./ComicCard.svelte";
  import NoteForm from "./NoteForm.svelte";
  import NoteItem from "./NoteItem.svelte";

  let {
    week,
    taxRate,
    readonly = false
  }: { week: WeekView; taxRate: number; readonly?: boolean } = $props();

  let addingNote = $state(false);
  const totals = $derived(computeTotals(week.items, taxRate));
  const copies = $derived(week.items.reduce((n, i) => n + i.copies, 0));
</script>

<section
  class="week"
  class:current={week.isCurrent}
  aria-labelledby="week-{week.key}"
>
  <header>
    <div>
      <h2 id="week-{week.key}">
        Week of {formatDate(week.key, {
          month: "long",
          day: "numeric"
        })}
        {#if week.isCurrent}<span class="tag">This week</span>{/if}
      </h2>
      <p class="muted range">
        {formatDate(week.start)} – {formatDate(week.end, { year: "numeric" })} ·
        {week.items.length}
        {week.items.length === 1 ? "title" : "titles"}, {copies}
        {copies === 1 ? "copy" : "copies"}
      </p>
    </div>

    <dl class="totals panel">
      <div>
        <dt>Total <span class="muted">(incl. {taxRate}% tax)</span></dt>
        <dd class="total">{formatMoney(totals.total)}</dd>
      </div>
      <div class="pullbox">
        <dt>
          Pullbox price <span class="muted"
            >({Math.round(PULLBOX_DISCOUNT * 100)}% off + tax)</span
          >
        </dt>
        <dd class="total">{formatMoney(totals.pullboxTotal)}</dd>
      </div>
    </dl>
  </header>

  {#if week.notes.length || !readonly}
    <div class="notes">
      {#if week.notes.length}
        <ul>
          {#each week.notes as note (note.id)}<NoteItem {note} />{/each}
        </ul>
      {/if}
      {#if !readonly}
        {#if addingNote}
          <NoteForm date={week.key} compact />
        {:else}
          <button class="link" onclick={() => (addingNote = true)}
            >+ Add note</button
          >
        {/if}
      {/if}
    </div>
  {/if}

  {#if week.items.length}
    <div class="grid">
      {#each week.items as item (item.key)}
        <ComicCard {item} {readonly} />
      {/each}
    </div>
  {:else}
    <p class="empty muted">Nothing pulled for this week.</p>
  {/if}
</section>

<style>
  .week {
    margin-bottom: 4rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 1.6rem;
    margin-bottom: 1.6rem;
    padding-bottom: 1.2rem;
    border-bottom: 1px solid var(--sk-border);
  }
  h2 {
    margin: 0;
    font: var(--sk-font-h3);
    display: flex;
    align-items: center;
    gap: 1.2rem;
    flex-wrap: wrap;
  }
  .tag {
    font: var(--sk-font-ui-small);
    background: var(--sk-bg-accent);
    color: white;
    padding: 0.1rem 1rem;
    border-radius: 10rem;
  }
  .range {
    margin: 0.4rem 0 0;
    font-size: 1.3rem;
  }
  .totals {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 2.4rem;
    padding: 1rem 1.6rem;
  }
  .totals > div {
    display: grid;
  }
  dt {
    font-size: 1.2rem;
    color: var(--sk-fg-3);
  }
  dd {
    margin: 0;
  }
  .total {
    font: var(--sk-font-h3);
    font-size: 2.4rem;
    color: var(--sk-fg-1);
  }
  .pullbox .total {
    color: var(--sk-fg-accent);
  }
  .notes {
    display: grid;
    gap: 1rem;
    margin-bottom: 1.6rem;
    justify-items: start;
  }
  .notes ul {
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.8rem;
    width: 100%;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 34rem), 1fr));
    gap: 1.2rem;
  }
  .empty {
    padding: 2rem 0;
  }
</style>
