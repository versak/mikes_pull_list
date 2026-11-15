<script lang="ts">
  import { formatDate, isDateString, weekKey } from "$lib/dates";
  import NoteForm from "$lib/components/NoteForm.svelte";
  import NoteItem from "$lib/components/NoteItem.svelte";
  import type { Note } from "$lib/types";

  let { data } = $props();

  let picked = $state("");
  const date = $derived(isDateString(picked) ? picked : data.today);
  const targetWeek = $derived(weekKey(date));

  const groups = $derived.by(() => {
    const map = new Map<string, Note[]>();
    for (const n of data.notes)
      map.set(n.weekKey, [...(map.get(n.weekKey) ?? []), n]);
    return [...map].sort(([a], [b]) => a.localeCompare(b));
  });
  const currentWeek = $derived(weekKey(data.today));
</script>

<svelte:head><title>Notes · Mike's Pull List</title></svelte:head>

<h1 class="title">Notes</h1>
<p class="muted lead">
  Notes appear at the top of that week's pull list. Pick any date, including
  future weeks.
</p>

<section class="panel compose">
  <label>
    <span>Week containing</span>
    <input type="date" bind:value={picked} placeholder={data.today} />
  </label>
  <p class="muted">
    Applies to the week of <strong
      >{formatDate(targetWeek, {
        month: "long",
        day: "numeric",
        year: "numeric"
      })}</strong
    >.
  </p>
  {#key targetWeek}
    <NoteForm date={targetWeek} />
  {/key}
</section>

{#each groups as [key, notes] (key)}
  <section class="group">
    <h2>
      Week of {formatDate(key, {
        month: "short",
        day: "numeric",
        year: "numeric"
      })}
      {#if key === currentWeek}<span class="tag">This week</span
        >{:else if key < currentWeek}<span class="muted past">past</span>{/if}
    </h2>
    <ul>
      {#each notes as note (note.id)}<NoteItem {note} />{/each}
    </ul>
  </section>
{:else}
  <p class="muted">No notes yet.</p>
{/each}

<style>
  .title {
    font: var(--sk-font-h2);
    font-size: 3.6rem;
    margin: 0 0 0.4rem;
  }
  .lead {
    margin: 0 0 2rem;
  }
  .compose {
    display: grid;
    gap: 1.2rem;
    padding: 1.6rem;
    max-width: 60rem;
    margin-bottom: 3rem;
  }
  .compose p {
    margin: 0;
  }
  label {
    display: grid;
    gap: 0.4rem;
    max-width: 22rem;
  }
  label span {
    font: var(--sk-font-ui-small);
    color: var(--sk-fg-3);
  }
  .group {
    margin-bottom: 2.4rem;
    max-width: 80rem;
  }
  h2 {
    font: var(--sk-font-ui-medium);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 0 0 0.8rem;
  }
  .tag {
    font: var(--sk-font-ui-small);
    background: var(--sk-bg-accent);
    color: white;
    padding: 0 0.9rem;
    border-radius: 10rem;
  }
  .past {
    font-size: 1.2rem;
  }
  ul {
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.8rem;
  }
</style>
