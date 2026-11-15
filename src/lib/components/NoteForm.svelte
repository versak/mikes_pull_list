<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { send } from "$lib/client/api";
  import { errorMessage, notify } from "$lib/client/toast.svelte";

  let { date, compact = false }: { date: string; compact?: boolean } = $props();
  let text = $state("");
  let busy = $state(false);

  async function add(event: SubmitEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    busy = true;
    try {
      await send("POST", "/api/notes", { date, text });
      text = "";
      await invalidateAll();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      busy = false;
    }
  }
</script>

<form onsubmit={add} class:compact>
  <label class="visually-hidden" for="note-{date}"
    >Add a note for this week</label
  >
  <textarea
    id="note-{date}"
    bind:value={text}
    maxlength="2000"
    rows={compact ? 2 : 3}
    placeholder="Add a note for this week…"></textarea>
  <button class="primary" disabled={busy || !text.trim()}>Add note</button>
</form>

<style>
  form {
    display: grid;
    gap: 0.8rem;
    justify-items: start;
  }
  textarea {
    min-height: 6rem;
  }
  .compact textarea {
    min-height: 4.4rem;
  }
</style>
