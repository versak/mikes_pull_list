<script lang="ts">
  import { enhance } from "$app/forms";
  import Logo from "$lib/components/Logo.svelte";

  let { form } = $props();
  let busy = $state(false);
</script>

<svelte:head><title>Sign in · Mike's Pull List</title></svelte:head>

<div class="login">
  <form
    method="POST"
    class="panel"
    use:enhance={() => {
      busy = true;
      return async ({ update }) => {
        await update();
        busy = false;
      };
    }}
  >
    <h1><Logo /> Mike's Pull List</h1>

    <label>
      <span>Username</span>
      <input
        name="username"
        type="email"
        autocomplete="username"
        required
        value={form?.username ?? ""}
      />
    </label>
    <label>
      <span>Password</span>
      <input
        name="password"
        type="password"
        autocomplete="current-password"
        required
      />
    </label>

    {#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}

    <button class="primary" disabled={busy}
      >{busy ? "Signing in…" : "Sign in"}</button
    >
  </form>
</div>

<style>
  .login {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
  }
  form {
    width: min(24rem, 100%);
    display: grid;
    gap: 1.2rem;
    padding: 2.4rem;
  }
  h1 {
    font: var(--sk-font-h3);
    font-size: 2.6rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 0 0 0.6rem;
  }
  label {
    display: grid;
    gap: 0.4rem;
  }
  label span {
    font: var(--sk-font-ui-small);
    color: var(--sk-fg-3);
  }
  .error {
    margin: 0;
    color: var(--sk-fg-accent);
    font: var(--sk-font-ui-small);
  }
</style>
