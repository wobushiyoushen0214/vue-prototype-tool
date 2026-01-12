<!--
 * @Author: LiZhiWei
 * @Date: 2026-01-07 15:37:12
 * @LastEditors: LiZhiWei
 * @LastEditTime: 2026-01-07 16:15:10
 * @Description: 
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useEditorStore } from './store/editor'

const store = useEditorStore()

onMounted(() => {
  store.initProjects()
})
</script>

<template>
  <router-view />
</template>

<style>
#app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
