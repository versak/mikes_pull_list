<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import Logo from "$lib/components/Logo.svelte";
  import Toasts from "$lib/components/Toasts.svelte";

  let { children } = $props();

  const tabs = [
    { href: "/", label: "Pull List" },
    { href: "/search", label: "Search" },
    { href: "/notes", label: "Notes" }
  ];

  const isActive = (href: string) =>
    href === "/"
      ? page.url.pathname === "/"
      : page.url.pathname.startsWith(href);
</script>

{#if page.url.pathname !== "/login"}
  <header>
    <div class="bar">
      <a class="brand" href="/"><Logo /> <span>Mike's Pull List</span></a>
      <nav aria-label="Main">
        {#each tabs as tab (tab.href)}
          <a
            href={tab.href}
            class:active={isActive(tab.href)}
            aria-current={isActive(tab.href) ? "page" : undefined}
          >
            {tab.label}
          </a>
        {/each}
      </nav>
      <div class="account">
        <a href="/settings" class:active={isActive("/settings")}>Settings</a>
        <form method="POST" action="/logout">
          <button class="link">Sign out</button>
        </form>
      </div>
    </div>
  </header>
{/if}

<main>
  {@render children()}
</main>

<Toasts />

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--sk-bg-0);
    border-bottom: 1px solid var(--sk-border);
  }
  .bar {
    max-width: 120rem;
    margin: 0 auto;
    padding: 0 1.6rem;
    display: flex;
    align-items: center;
    gap: 2.4rem;
    flex-wrap: wrap;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font: var(--sk-font-h3);
    font-size: 2.2rem;
    color: var(--sk-fg-1);
    padding: 0.8rem 0;
  }
  .brand:hover {
    text-decoration: none;
  }
  nav {
    display: flex;
    gap: 0.4rem;
    flex: 1;
    align-self: stretch;
  }
  nav a,
  .account a {
    display: flex;
    align-items: center;
    padding: 0 1.4rem;
    color: var(--sk-fg-3);
    border-bottom: 2px solid transparent;
    font-size: 1.5rem;
  }
  nav a:hover,
  .account a:hover {
    color: var(--sk-fg-1);
    text-decoration: none;
  }
  nav a.active,
  .account a.active {
    color: var(--sk-fg-1);
    border-bottom-color: var(--sk-fg-accent);
  }
  .account {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    align-self: stretch;
  }
  .account form {
    display: flex;
    padding: 0 1rem;
  }
  main {
    max-width: 120rem;
    margin: 0 auto;
    padding: 2.4rem 1.6rem 6rem;
  }

  @media (max-width: 640px) {
    .bar {
      gap: 0.4rem 1.2rem;
    }
    nav {
      order: 3;
      flex-basis: 100%;
    }
    nav a {
      flex: 1;
      justify-content: center;
      padding: 1rem 0;
    }
    .account {
      margin-left: auto;
    }
  }
</style>
