<template>
  <el-card class="team-card" :body-style="{ padding: '0px' }">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      class="image"
    />
    <div style="padding: 14px">
      <span class="title">{{ title }}</span>
      <div class="bottom">
        <time class="time">{{ time }}</time>
        <el-button text class="button">{{ buttonText }}</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: 'Yummy hamburger'
  },
  time: {
    type: String,
    default: '2023-10-01'
  },
  buttonText: {
    type: String,
    default: 'Operating'
  },
  imageUrl: {
    type: String,
    default: 'https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png'
  }
})
</script>

<style scoped>
.team-card {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.time {
  font-size: 12px;
  color: #999;
}

.bottom {
  margin-top: 13px;
  line-height: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.button {
  padding: 0;
  min-height: auto;
}

.image {
  width: 100%;
  display: block;
}

.title {
  font-weight: bold;
}
</style>
