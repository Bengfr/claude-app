<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
onMounted(() => auth.init())
</script>

<template>
  <router-view v-if="auth.ready" />
  <div v-else style="min-height:100vh; display:flex; align-items:center; justify-content:center;">
    <span class="spinner spinner-dark" style="width:2rem; height:2rem; border-width:3px;"></span>
  </div>
</template>
