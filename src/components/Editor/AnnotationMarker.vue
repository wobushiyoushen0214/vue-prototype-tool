<template>
  <div 
    class="annotation-marker" 
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop="handleClick"
  >
    <div class="marker-dot"><span>{{ index + 1 }}</span></div>
    <el-popover
      v-model:visible="visible"
      placement="top"
      :width="200"
      trigger="click"
    >
      <template #reference>
        <div class="marker-reference"></div>
      </template>
      <div class="annotation-content">
        <el-input
          v-model="editContent"
          type="textarea"
          :rows="3"
          placeholder="输入标注内容..."
          size="small"
        />
        <div class="annotation-actions">
          <el-button size="small" type="danger" text @click="handleDelete">删除</el-button>
          <el-button size="small" type="primary" @click="handleSave">保存</el-button>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useEditorStore } from '@/store/editor';

const props = defineProps<{
  id: string;
  x: number;
  y: number;
  content: string;
  index: number;
}>();

const store = useEditorStore();
const visible = ref(false);
const editContent = ref(props.content);

watch(() => props.content, (val) => {
  editContent.value = val;
});

const handleClick = () => {
  visible.value = !visible.value;
};

const handleSave = () => {
  store.updateAnnotation(props.id, editContent.value);
  visible.value = false;
};

const handleDelete = () => {
  store.deleteAnnotation(props.id);
  visible.value = false;
};
</script>

<style scoped>
.annotation-marker {
  position: absolute;
  z-index: 1000;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 4px 12px rgba(79, 70, 229, 0.4));
}

.marker-dot {
  width: 28px;
  height: 28px;
  background-color: var(--primary-color, #4f46e5);
  color: white;
  border-radius: 50% 50% 50% 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid white;
  transform: rotate(-45deg);
}

.marker-dot > span {
  transform: rotate(45deg);
  display: block;
}

.marker-dot:hover {
  transform: rotate(-45deg) scale(1.1);
  background-color: var(--primary-hover, #4338ca);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5);
}

.marker-reference {
  width: 1px;
  height: 1px;
  position: absolute;
  top: 0;
  left: 0;
}

.annotation-content {
  padding: 4px 0;
}

.annotation-content :deep(.el-textarea__inner) {
  font-size: 12px;
  border-radius: 6px;
  padding: 8px;
}

.annotation-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.annotation-actions :deep(.el-button) {
  padding: 6px 12px;
  height: auto;
  font-size: 11px;
}
</style>
