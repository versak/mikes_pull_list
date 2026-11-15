<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { send } from "$lib/client/api";
  import { errorMessage, notify } from "$lib/client/toast.svelte";
  import type { Note } from "$lib/types";

  let { note }: { note: Note } = $props();
  let editing = $state(false);
  let draft = $state("");
  let busy = $state(false);

  async function run(action: () => Promise<unknown>) {
    busy = true;
    try {
      await action();
      await invalidateAll();
      editing = false;
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      busy = false;
    }
  }
</script>

<li class="note">
  {#if editing}
    <textarea bind:value={draft} maxlength="2000" aria-label="Edit note"
    ></textarea>
    <div class="row">
      <button
        class="primary"
        disabled={busy || !draft.trim()}
        onclick={() =>
          run(() => send("PATCH", `/api/notes/${note.id}`, { text: draft }))}
        >Save</button
      >
      <button class="link" disabled={busy} onclick={() => (editing = false)}
        >Cancel</button
      >
    </div>
  {:else}
    <p>{note.text}</p>
    <div class="row">
      <button
        class="link"
        onclick={() => {
          draft = note.text;
          editing = true;
        }}>Edit</button
      >
      <button
        class="link"
        disabled={busy}
        onclick={() =>
          confirm("Delete this note?") &&
          run(() => send("DELETE", `/api/notes/${note.id}`))}>Delete</button
      >
    </div>
  {/if}
</li>

<style>
  .note {
    list-style: none;
    padding: 1rem 1.2rem;
    background: var(--sk-bg-3);
    border-left: 3px solid var(--sk-fg-accent);
    border-radius: 0 var(--radius) var(--radius) 0;
    display: grid;
    gap: 0.6rem;
  }
  p {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--sk-fg-1);
  }
  .row {
    display: flex;
    gap: 1.2rem;
    align-items: center;
  }
</style>
