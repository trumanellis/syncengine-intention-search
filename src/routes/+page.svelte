<script>
  import IntentionSearch from '$lib/IntentionSearch.svelte';

  // User's location - can be obtained from browser geolocation API
  // For now using Oakland, CA as default
  const userLocation = [37.8044, -122.2712];
</script>

<svelte:head>
  <title>SyncEngine - Intention Search</title>
  <meta name="description" content="P2P intention search with semantic vector matching" />
</svelte:head>

<IntentionSearch {userLocation} />
