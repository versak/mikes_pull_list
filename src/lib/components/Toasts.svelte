<script lang="ts">
  import { toasts } from "$lib/client/toast.svelte";
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class="toast">{toast.message}</div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    right: 1.6rem;
    bottom: 1.6rem;
    display: grid;
    gap: 0.8rem;
    z-index: 50;
    max-width: min(40rem, calc(100vw - 3.2rem));
  }
  .toast {
    background: var(--sk-bg-4);
    border: 1px solid var(--sk-fg-accent);
    border-radius: var(--radius);
    padding: 1rem 1.4rem;
    font: var(--sk-font-ui-small);
    font-size: 1.4rem;
    color: var(--sk-fg-1);
    filter: var(--sk-shadow);
  }
</style>
