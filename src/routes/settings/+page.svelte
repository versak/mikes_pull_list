<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { send } from "$lib/client/api";
  import { errorMessage, notify } from "$lib/client/toast.svelte";

  let { data } = $props();
  // svelte-ignore state_referenced_locally
  let taxRate = $state(data.settings.taxRate);
  let busy = $state(false);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await send("PUT", "/api/settings", { taxRate });
      await invalidateAll();
      notify("Settings saved.");
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Settings · Mike's Pull List</title></svelte:head>

<h1>Settings</h1>

<form class="panel" onsubmit={save}>
  <label>
    <span>Sales tax rate (%)</span>
    <input
      type="number"
      min="0"
      max="100"
      step="0.001"
      required
      bind:value={taxRate}
    />
  </label>
  <p class="muted">
    Applied to each week's total. The Pullbox price takes 10% off before tax is
    added.
  </p>
  <button class="primary" disabled={busy}>Save</button>
</form>

<p class="muted status">
  Metron release data: {data.metronConfigured
    ? "connected (API token set)"
    : "not configured — set METRON_API_TOKEN in .env"}
</p>

<style>
  h1 {
    font: var(--sk-font-h2);
    font-size: 3.6rem;
    margin: 0 0 2rem;
  }
  form {
    display: grid;
    gap: 1.2rem;
    padding: 1.6rem;
    max-width: 40rem;
    justify-items: start;
  }
  form p {
    margin: 0;
  }
  label {
    display: grid;
    gap: 0.4rem;
    width: 100%;
  }
  label span {
    font: var(--sk-font-ui-small);
    color: var(--sk-fg-3);
  }
  .status {
    margin-top: 2rem;
  }
</style>
