<script setup lang="ts">
defineProps<{ rows?: number }>()
</script>

<template>
  <div class="card" style="padding:1.25rem;">
    <div class="skeleton" style="height:.75rem; width:35%; margin-bottom:.75rem;" />
    <div class="skeleton" style="height:1.5rem; width:60%; margin-bottom:.9rem;" />
    <div v-for="i in (rows ?? 2)" :key="i"
         class="skeleton"
         :style="`height:.6rem; width:${i % 2 === 0 ? '80' : '100'}%; margin-bottom:.5rem;`" />
  </div>
</template>
