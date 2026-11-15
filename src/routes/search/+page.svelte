<script lang="ts">
  import { onMount } from "svelte";
  import { send } from "$lib/client/api";
  import { errorMessage } from "$lib/client/toast.svelte";
  import SearchCard from "$lib/components/SearchCard.svelte";
  import type { Publisher, SearchIssue, SearchResponse } from "$lib/types";

  let query = $state("");
  let publisher = $state("");
  let after = $state("");
  let before = $state("");

  let publishers = $state<Publisher[]>([]);
  let results = $state<SearchIssue[]>([]);
  let count = $state(0);
  let nextPage = $state<number | null>(null);
  let searched = $state(false);
  let loading = $state(false);
  let error = $state("");

  onMount(() => {
    send<Publisher[]>("GET", "/api/publishers")
      .then((list) => (publishers = list))
      .catch(() => {
        // The publisher filter is optional; searching still works without it.
      });
  });

  function params(page: number): string {
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    if (publisher) p.set("publisher", publisher);
    if (after) p.set("after", after);
    if (before) p.set("before", before);
    if (page > 1) p.set("page", String(page));
    return p.toString();
  }

  async function load(page: number) {
    loading = true;
    error = "";
    try {
      const res = await send<SearchResponse>(
        "GET",
        `/api/search?${params(page)}`
      );
      const seen = new Set(page === 1 ? [] : results.map((r) => r.id));
      results =
        page === 1
          ? res.results
          : [...results, ...res.results.filter((r) => !seen.has(r.id))];
      count = res.count;
      nextPage = res.nextPage;
      searched = true;
    } catch (e) {
      error = errorMessage(e);
    } finally {
      loading = false;
    }
  }

  function markSubscribed(seriesId: number) {
    for (const r of results) if (r.seriesId === seriesId) r.subscribed = true;
  }
</script>

<svelte:head><title>Search · Mike's Pull List</title></svelte:head>

<form
  class="panel filters"
  onsubmit={(e) => {
    e.preventDefault();
    void load(1);
  }}
>
  <label class="wide">
    <span>Series title</span>
    <input
      type="search"
      bind:value={query}
      placeholder="e.g. Batman, Saga, Spider-Man"
      maxlength="100"
    />
  </label>
  <label>
    <span>Publisher</span>
    <select bind:value={publisher}>
      <option value="">All publishers</option>
      {#each publishers as p (p.id)}<option value={String(p.id)}
          >{p.name}</option
        >{/each}
    </select>
  </label>
  <div class="submit">
    <button class="primary" disabled={loading}
      >{loading && results.length === 0 ? "Searching…" : "Search"}</button
    >
  </div>
  <p class="muted hint">
    Leave dates empty to search every release from this week onward, including
    future solicitations.
  </p>
</form>

{#if error}<p class="error panel" role="alert">{error}</p>{/if}

{#if searched}
  <p class="muted count">{count} {count === 1 ? "issue" : "issues"} found</p>
  <div class="grid">
    {#each results as _, i (results[i].id)}
      <SearchCard bind:issue={results[i]} onSubscribed={markSubscribed} />
    {/each}
  </div>
  {#if nextPage}
    <p class="more">
      <button disabled={loading} onclick={() => load(nextPage!)}
        >{loading ? "Loading…" : "Load more"}</button
      >
    </p>
  {/if}
{:else if !loading && !error}
  <p class="muted intro">
    Search for a series to pull a single issue or subscribe to every upcoming
    issue.
  </p>
{/if}

<style>
  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: 1.2rem;
    padding: 1.6rem;
    align-items: end;
    margin-bottom: 2rem;
  }
  .wide {
    grid-column: 1 / -1;
  }
  label {
    display: grid;
    gap: 0.4rem;
  }
  label span {
    font: var(--sk-font-ui-small);
    color: var(--sk-fg-3);
  }
  .hint {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 1.2rem;
  }
  .error {
    padding: 1.2rem 1.6rem;
    color: var(--sk-fg-accent);
    border-color: var(--sk-bg-accent);
  }
  .count {
    margin: 0 0 1.2rem;
    font-size: 1.3rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 40rem), 1fr));
    gap: 1.2rem;
    align-items: start;
  }
  .more {
    text-align: center;
    margin-top: 2.4rem;
  }
</style>
