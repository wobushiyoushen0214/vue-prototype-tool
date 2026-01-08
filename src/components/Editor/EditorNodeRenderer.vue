<template>
  <div
    :id="node.id"
    class="editor-node"
    :class="{ 
      selected: isSelected && store.mode === 'edit',
      'preview-mode': store.mode === 'preview',
      'is-container': isContainer
    }"
    :style="nodeStyle"
    @mousedown.stop="handleMouseDown"
    v-show="!node.hidden"
  >
    <!-- 组件本身 -->
    <EditorComponent 
      :type="node.type"
      :props="node.props"
      :style="node.style"
      :is-preview="store.mode === 'preview'"
    >
      <!-- 递归渲染子节点 -->
      <template v-if="isContainer">
        <EditorNodeRenderer
          v-for="child in node.children"
          :key="child.id"
          :node="child"
        />
      </template>
    </EditorComponent>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '@/store/editor';
import type { EditorNode } from '@/types/editor';
import EditorComponent from './EditorComponent.vue';

const props = defineProps<{
  node: EditorNode;
}>();

const store = useEditorStore();

const isSelected = computed(() => store.selectedNodeIds.includes(props.node.id));
const isContainer = computed(() => props.node.type === 'container');

const nodeStyle = computed(() => {
  const style = props.node.style || {};
  const parentNode = props.node.parentId ? store.nodes.find(n => n.id === props.node.parentId) : null;
  const isFlexChild = parentNode?.type === 'container' && parentNode.props?.display === 'flex';
  return {
    position: (isFlexChild ? 'static' : 'absolute') as 'static' | 'absolute',
    left: isFlexChild ? undefined : style.left,
    top: isFlexChild ? undefined : style.top,
    width: style.width,
    height: style.height,
    transform: style.transform,
    zIndex: isSelected.value ? 10 : 1
  };
});

const handleMouseDown = (e: MouseEvent) => {
  if (store.mode === 'preview') return;
  
  // 阻止冒泡，避免选中父级
  // 但如果是多选 (Shift/Cmd)，需要特殊处理吗？
  // 这里只负责通知 Canvas 或 Store 选中了自己
  // 实际上 Canvas 的 @mousedown 会处理空白处点击
  // 这里的 .stop 很重要
  
  const multi = e.shiftKey || e.metaKey || e.ctrlKey;
  store.selectNode(props.node.id, multi);
  
  // 发送自定义事件给 Canvas，用于启动 Moveable
  // 因为 EditorCanvas 需要知道是哪个节点被点击了，以及是否是多选
  // 但 Canvas 可以通过 store.selectedNodeIds 知道
  // 关键是 Moveable 的 target 需要更新
  
  // 触发一个自定义事件，让 Canvas 捕获
  const event = new CustomEvent('node-mousedown', { 
    detail: { id: props.node.id, originalEvent: e },
    bubbles: true 
  });
  e.target?.dispatchEvent(event);
};
</script>

<style scoped>
.editor-node {
  position: absolute;
  box-sizing: border-box;
  /* 选中态样式由 Moveable 处理，这里只处理一些基础交互样式 */
}

.editor-node.selected {
  /* 可选：添加一点高亮，虽然 Moveable 会有框 */
  /* outline: 1px solid #409eff; */
}

.editor-node:hover {
  /* outline: 1px dashed #409eff; */
}

.is-container {
  /* 容器组件的特殊样式 */
}
</style>
