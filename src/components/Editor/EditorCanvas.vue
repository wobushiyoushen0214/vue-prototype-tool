<template>
  <div class="canvas-wrapper" 
       ref="wrapperRef"
       @mousedown="handleWrapperMouseDown"
       @wheel="handleWheel"
  >
    <div 
      class="editor-canvas" 
      :class="{ 'preview-mode': store.mode === 'preview' }"
      ref="canvasRef"
      @dragover.prevent
      @drop="handleDrop"
      @mousedown="handleCanvasClick"
      @node-mousedown="handleNodeMouseDown"
      :style="{
        width: store.config.width + 'px',
        height: store.config.height + 'px',
        backgroundColor: store.config.backgroundColor,
        transform: `scale(${store.zoom}) translate(${store.offset.x}px, ${store.offset.y}px)`,
        '--zoom': store.zoom
      }"
    >
      <EditorNodeRenderer
        v-for="node in store.treeNodes"
        :key="node.id"
        :node="node"
      />

      <!-- 标注 -->
      <template v-if="store.mode === 'preview'">
        <AnnotationMarker
          v-for="(ann, index) in store.annotations"
          :key="ann.id"
          :id="ann.id"
          :x="ann.x"
          :y="ann.y"
          :content="ann.content"
          :index="index"
        />
      </template>

      <!-- 多选/单选控制 -->
      <Moveable
        v-if="(targetElements.length > 0 || targetElement) && store.mode === 'edit' && !lockedSelected"
        :target="targetElements.length > 1 ? targetElements : targetElement"
        :draggable="true"
        :resizable="true"
        :rotatable="true"
        :snappable="true"
        :snapCenter="true"
        :snapHorizontal="true"
        :snapVertical="true"
        :snapElement="true"
        :elementGuidelines="elementGuidelines"
        :snapThreshold="10"
        :isDisplaySnapDigit="true"
        :verticalGuidelines="[0, store.config.width]"
        :horizontalGuidelines="[0, store.config.height]"
        :bounds="null"
        :zoom="store.zoom"
        @drag="onDrag"
        @resize="onResize"
        @rotate="onRotate"
        @dragEnd="onDragEnd"
        @resizeEnd="onResizeEnd"
        @rotateEnd="onRotateEnd"
        @dragGroup="onDragGroup"
        @resizeGroup="onResizeGroup"
        @rotateGroup="onRotateGroup"
        @dragGroupEnd="onDragGroupEnd"
        @resizeGroupEnd="onResizeGroupEnd"
        @rotateGroupEnd="onRotateGroupEnd"
      />
    </div>

    <!-- 框选矩形 -->
    <div 
      v-if="isSelecting" 
      class="selection-box"
      :style="selectionBoxStyle"
    ></div>
    <template v-if="distanceGuides.length">
      <template v-for="(g, idx) in distanceGuides" :key="idx">
        <div class="distance-guide-line" :style="g.lineStyle"></div>
        <div class="distance-guide-label" :style="g.labelStyle">{{ g.label }}</div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue';
import { useEditorStore } from '@/store/editor';
import Moveable from 'vue3-moveable';
import EditorNodeRenderer from '@/components/Editor/EditorNodeRenderer.vue';
import AnnotationMarker from '@/components/Editor/AnnotationMarker.vue';
import { throttle } from 'lodash-es';

const store = useEditorStore();
const canvasRef = ref<HTMLElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
const targetElement = ref<HTMLElement | null>(null);
const targetElements = ref<HTMLElement[]>([]);
const lockedSelected = ref(false);

type DistanceGuide = { lineStyle: Record<string, string>; labelStyle: Record<string, string>; label: string };
const distanceGuides = ref<DistanceGuide[]>([]);

// Pan state
let isPanning = false;
let startX = 0;
let startY = 0;
let initialOffset = { x: 0, y: 0 };
const spacePressed = ref(false);

// Selection state
const isSelecting = ref(false);
const selectionStart = ref({ x: 0, y: 0 });
const selectionEnd = ref({ x: 0, y: 0 });

const selectionBoxStyle = computed(() => {
  const left = Math.min(selectionStart.value.x, selectionEnd.value.x);
  const top = Math.min(selectionStart.value.y, selectionEnd.value.y);
  const width = Math.abs(selectionEnd.value.x - selectionStart.value.x);
  const height = Math.abs(selectionEnd.value.y - selectionStart.value.y);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    position: 'fixed' as const, // 相对于视口
    border: '1px solid #409eff',
    backgroundColor: 'rgba(64, 158, 255, 0.2)',
    zIndex: 9999,
    pointerEvents: 'none' as const
  };
});

const handleDrop = (e: DragEvent) => {
  if (!store.draggedComponent || !canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  let x = (e.clientX - rect.left) / store.zoom;
  let y = (e.clientY - rect.top) / store.zoom;

  // 检查是否拖入容器 (简单的碰撞检测)
  // 注意：这里需要更复杂的逻辑来处理嵌套，特别是当鼠标在子组件上时
  // 目前简单实现：如果放在了某个 node 上，且该 node 是 container
  const elementFromPoint = document.elementFromPoint(e.clientX, e.clientY);
  // 必须找到带有 ID 的 editor-node 且是 container 的元素
  const containerEl = elementFromPoint?.closest('.editor-node.is-container');
  let parentId: string | undefined;

  if (containerEl && containerEl.id) {
     // 确保不是拖拽组件自己
     parentId = containerEl.id;
     
     // 重新计算相对于容器的坐标
     const containerRect = containerEl.getBoundingClientRect();
     // 注意：这里 x, y 应该是相对于容器左上角的
     // e.clientX 是视口坐标
     // containerRect 是视口坐标
     // 所以：
     x = (e.clientX - containerRect.left) / store.zoom;
     y = (e.clientY - containerRect.top) / store.zoom;
  }

  store.addNode(store.draggedComponent, parentId, { x, y });
  store.setDraggedComponent(null);
  
  nextTick(updateTarget);
};

// 接收来自子组件的 mousedown 事件
const handleNodeMouseDown = (e: CustomEvent) => {
    // 逻辑已在 EditorNodeRenderer 中处理了 selectNode
    // 这里主要是为了确保 Moveable 目标更新
    nextTick(updateTarget);
};

const handleCanvasClick = (e: MouseEvent) => {
  if (store.mode === 'preview' && e.altKey && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const x = (e.clientX - rect.left) / store.zoom;
    const y = (e.clientY - rect.top) / store.zoom;
    store.addAnnotation({ x, y, content: '' });
    return;
  }
  
  // 如果是按住空格或中键，不清除选中
  if (e.button === 1 || spacePressed.value) return;
  
  // 点击空白处，清除选中
  // 只有在没有按修饰键时才清除
  if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      store.clearSelection();
      targetElement.value = null;
      targetElements.value = [];
  }
};

const handleWrapperMouseDown = (e: MouseEvent) => {
  // 中键 (1) 或 空格+左键 (0) -> 平移
  if (e.button === 1 || (spacePressed.value && e.button === 0)) {
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    initialOffset = { ...store.offset };
    e.preventDefault();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return;
  }

  // 左键点击且不是在 Node 上 (Node 的 mousedown 会阻止冒泡到这里吗？)
  // Node 使用了 .stop，所以不会冒泡到 Wrapper
  // 所以如果到了这里，说明点在空白处，可以开始框选
  if (e.button === 0 && store.mode === 'edit') {
      isSelecting.value = true;
      selectionStart.value = { x: e.clientX, y: e.clientY };
      selectionEnd.value = { x: e.clientX, y: e.clientY };
      
      // 如果没有按住 Shift/Ctrl，先清除当前选中
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
          store.clearSelection();
      }

      window.addEventListener('mousemove', handleSelectionMove);
      window.addEventListener('mouseup', handleSelectionUp);
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isPanning) return;
  const dx = (e.clientX - startX) / store.zoom;
  const dy = (e.clientY - startY) / store.zoom;
  
  store.setOffset({
    x: initialOffset.x + dx,
    y: initialOffset.y + dy
  });
};

const handleMouseUp = () => {
  isPanning = false;
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
};

const handleSelectionMove = (e: MouseEvent) => {
    if (!isSelecting.value) return;
    selectionEnd.value = { x: e.clientX, y: e.clientY };
};

const handleSelectionUp = () => {
    if (!isSelecting.value) return;
    isSelecting.value = false;
    window.removeEventListener('mousemove', handleSelectionMove);
    window.removeEventListener('mouseup', handleSelectionUp);
    
    // 计算框选结果
    calculateSelection();
};

const calculateSelection = () => {
    if (!canvasRef.value) return;
    
    const left = Math.min(selectionStart.value.x, selectionEnd.value.x);
    const top = Math.min(selectionStart.value.y, selectionEnd.value.y);
    const right = Math.max(selectionStart.value.x, selectionEnd.value.x);
    const bottom = Math.max(selectionStart.value.y, selectionEnd.value.y);
    
    // 如果框太小，视为点击，忽略
    if (right - left < 5 && bottom - top < 5) return;

    const nodes = document.querySelectorAll('.editor-node');
    const selectedIds: string[] = [];

    nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        // 简单的 AABB 碰撞检测
        // 只要有交叉就算选中
        if (rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
            selectedIds.push(node.id);
        }
    });

    // 更新 Store
    // 如果按住了 Shift，则是增量选择，否则是替换
    // 这里简单起见，直接选中这些
    if (selectedIds.length > 0) {
        selectedIds.forEach(id => store.selectNode(id, true));
    }
};

const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    store.setZoom(store.zoom * delta);
  } else {
    e.preventDefault();
    const dx = -e.deltaX / store.zoom;
    const dy = -e.deltaY / store.zoom;
    store.setOffset({
      x: store.offset.x + dx,
      y: store.offset.y + dy
    });
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
    spacePressed.value = true;
    if (wrapperRef.value) wrapperRef.value.style.cursor = 'grab';
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    spacePressed.value = false;
    if (wrapperRef.value) wrapperRef.value.style.cursor = 'default';
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});

const elementGuidelines = ref<HTMLElement[]>([]);

const updateGuidelines = () => {
  const elements = document.querySelectorAll('.editor-node');
  elementGuidelines.value = Array.from(elements)
    .filter(el => !store.selectedNodeIds.includes(el.id)) as HTMLElement[];
};

const updateTarget = () => {
  const ids = store.selectedNodeIds;
  if (ids.length === 0) {
      targetElement.value = null;
      targetElements.value = [];
      lockedSelected.value = false;
  } else if (ids.length === 1) {
      const id = ids[0];
      if (!id) return;
      const node = store.nodes.find(n => n.id === id);
      lockedSelected.value = !!node?.locked;
      targetElement.value = document.getElementById(id);
      targetElements.value = [];
      updateGuidelines();
  } else {
      // 多选
      targetElement.value = null;
      targetElements.value = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
      lockedSelected.value = false;
      updateGuidelines();
  }
};

// Moveable Events
const maybeExpandCanvasByTarget = (target: HTMLElement, override?: { left?: number; top?: number }) => {
  const left = override?.left ?? (parseFloat(target.style.left) || 0);
  const top = override?.top ?? (parseFloat(target.style.top) || 0);
  const width = target.offsetWidth;
  const height = target.offsetHeight;
  store.checkAndExpandCanvas({ left, top, right: left + width, bottom: top + height });
};

const clearDistanceGuides = () => {
  distanceGuides.value = [];
};

const buildDistanceGuides = (targetEl: HTMLElement, baseLeft: number, baseTop: number, gapPx: number) => {
  const guides: DistanceGuide[] = [];
  const rect = targetEl.getBoundingClientRect();
  const others = (Array.from(document.querySelectorAll('.editor-node')) as HTMLElement[])
    .filter(el => el !== targetEl)
    .filter(el => el.offsetParent !== null);

  const snapThresholdPx = 10;

  let bestH: { dist: number; x1: number; x2: number; y: number; side: 'left' | 'right' } | null = null;
  let bestV: { dist: number; y1: number; y2: number; x: number; side: 'top' | 'bottom' } | null = null;

  others.forEach(el => {
    const r = el.getBoundingClientRect();
    const overlapY = Math.min(rect.bottom, r.bottom) - Math.max(rect.top, r.top);
    const overlapX = Math.min(rect.right, r.right) - Math.max(rect.left, r.left);

    if (overlapY > 6) {
      const distLeft = rect.left - r.right;
      const distRight = r.left - rect.right;
      const y = Math.max(rect.top, r.top) + overlapY / 2;

      if (distLeft >= 0 && (!bestH || distLeft < bestH.dist)) {
        bestH = { dist: distLeft, x1: r.right, x2: rect.left, y, side: 'left' };
      }
      if (distRight >= 0 && (!bestH || distRight < bestH.dist)) {
        bestH = { dist: distRight, x1: rect.right, x2: r.left, y, side: 'right' };
      }
    }

    if (overlapX > 6) {
      const distTop = rect.top - r.bottom;
      const distBottom = r.top - rect.bottom;
      const x = Math.max(rect.left, r.left) + overlapX / 2;

      if (distTop >= 0 && (!bestV || distTop < bestV.dist)) {
        bestV = { dist: distTop, y1: r.bottom, y2: rect.top, x, side: 'top' };
      }
      if (distBottom >= 0 && (!bestV || distBottom < bestV.dist)) {
        bestV = { dist: distBottom, y1: rect.bottom, y2: r.top, x, side: 'bottom' };
      }
    }
  });

  let nextLeft = baseLeft;
  let nextTop = baseTop;

  if (bestH !== null) {
    const h = bestH;
    const distCanvas = h.dist / store.zoom;
    const xMin = Math.min(h.x1, h.x2);
    const xMax = Math.max(h.x1, h.x2);
    guides.push({
      lineStyle: {
        position: 'fixed',
        left: `${xMin}px`,
        top: `${h.y}px`,
        width: `${Math.max(0, xMax - xMin)}px`,
        height: `calc(1.5px / var(--zoom))`,
      },
      labelStyle: {
        position: 'fixed',
        left: `${(xMin + xMax) / 2}px`,
        top: `${h.y}px`,
        transform: 'translate(-50%, calc(-100% - 6px))',
      },
      label: `${Math.round(distCanvas)}px`,
    });

    if (Math.abs(distCanvas - gapPx) <= snapThresholdPx) {
      if (h.side === 'left') {
        nextLeft = baseLeft + (gapPx - distCanvas);
      } else {
        nextLeft = baseLeft + (distCanvas - gapPx);
      }
    }
  }

  if (bestV !== null) {
    const v = bestV;
    const distCanvas = v.dist / store.zoom;
    const yMin = Math.min(v.y1, v.y2);
    const yMax = Math.max(v.y1, v.y2);
    guides.push({
      lineStyle: {
        position: 'fixed',
        left: `${v.x}px`,
        top: `${yMin}px`,
        width: `calc(1.5px / var(--zoom))`,
        height: `${Math.max(0, yMax - yMin)}px`,
      },
      labelStyle: {
        position: 'fixed',
        left: `${v.x}px`,
        top: `${(yMin + yMax) / 2}px`,
        transform: 'translate(calc(-100% - 6px), -50%)',
      },
      label: `${Math.round(distCanvas)}px`,
    });

    if (Math.abs(distCanvas - gapPx) <= snapThresholdPx) {
      if (v.side === 'top') {
        nextTop = baseTop + (gapPx - distCanvas);
      } else {
        nextTop = baseTop + (distCanvas - gapPx);
      }
    }
  }

  distanceGuides.value = guides;
  return { left: nextLeft, top: nextTop };
};

// Single Target Events
const onDrag = throttle(({ target, left, top }: any) => {
  target.style.left = `${left}px`;
  target.style.top = `${top}px`;
  const snapped = buildDistanceGuides(target, left, top, 8);
  if (snapped.left !== left || snapped.top !== top) {
    target.style.left = `${snapped.left}px`;
    target.style.top = `${snapped.top}px`;
    maybeExpandCanvasByTarget(target, { left: snapped.left, top: snapped.top });
    return;
  }
  maybeExpandCanvasByTarget(target, { left, top });
}, 16);

const onDragEnd = ({ target }: any) => {
  clearDistanceGuides();
  // 检查是否拖入了容器
  const rect = target.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // 暂时隐藏自己以检测下方的元素
  const originalDisplay = target.style.display;
  target.style.display = 'none';
  const elementBelow = document.elementFromPoint(centerX, centerY);
  target.style.display = originalDisplay;
  
  // 必须找到带有 ID 的 editor-node 且是 container 的元素
  const container = elementBelow?.closest('.editor-node.is-container');
  
  if (container && container.id !== target.id) {
       // 这是一个容器，且不是自己
       const containerRect = container.getBoundingClientRect();
       const nodeRect = target.getBoundingClientRect();
       
       const relativeLeft = (nodeRect.left - containerRect.left) / store.zoom;
       const relativeTop = (nodeRect.top - containerRect.top) / store.zoom;
       
       store.moveNodeToParent(target.id, container.id);
       store.updateNodeStyle(target.id, {
         left: `${relativeLeft}px`,
         top: `${relativeTop}px`
       });
  } else {
       // 检查是否需要移出容器 (如果当前有 parent)
       const node = store.nodes.find(n => n.id === target.id);
       if (node?.parentId) {
           // 转换为绝对坐标
           // 如果不在任何容器范围内，就移出。
           if (!container) {
               const canvasRect = canvasRef.value!.getBoundingClientRect();
               const nodeRect = target.getBoundingClientRect();
               const absLeft = (nodeRect.left - canvasRect.left) / store.zoom;
               const absTop = (nodeRect.top - canvasRect.top) / store.zoom;
               
               store.moveNodeToParent(target.id, undefined);
               store.updateNodeStyle(target.id, {
                   left: `${absLeft}px`,
                   top: `${absTop}px`
               });
           }
       } else {
           // 普通更新
           store.updateNodeStyle(target.id, {
             left: target.style.left,
             top: target.style.top
           });
       }
  }

  maybeExpandCanvasByTarget(target);
  store.saveHistory();
};

const onResize = ({ target, width, height, drag }: any) => {
  clearDistanceGuides();
  target.style.width = `${width}px`;
  target.style.height = `${height}px`;
  target.style.transform = drag.transform;
};

const onResizeEnd = ({ target }: any) => {
  store.updateNodeStyle(target.id, {
    width: target.style.width,
    height: target.style.height
  });
  maybeExpandCanvasByTarget(target);
  store.saveHistory();
};

const onRotate = ({ target, transform }: any) => {
  clearDistanceGuides();
  target.style.transform = transform;
};

const onRotateEnd = ({ target }: any) => {
  store.updateNodeStyle(target.id, {
    transform: target.style.transform
  });
  maybeExpandCanvasByTarget(target);
  store.saveHistory();
};

// Group Events
const onDragGroup = ({ events }: any) => {
    events.forEach((ev: any) => {
        ev.target.style.left = `${ev.left}px`;
        ev.target.style.top = `${ev.top}px`;
    });
};

const onDragGroupEnd = ({ events }: any) => {
    events.forEach((ev: any) => {
        store.updateNodeStyle(ev.target.id, {
            left: ev.target.style.left,
            top: ev.target.style.top
        });
    });
    store.saveHistory();
};

const onResizeGroup = ({ events }: any) => {
    events.forEach((ev: any) => {
        ev.target.style.width = `${ev.width}px`;
        ev.target.style.height = `${ev.height}px`;
        ev.target.style.transform = ev.drag.transform;
    });
};

const onResizeGroupEnd = ({ events }: any) => {
    events.forEach((ev: any) => {
        store.updateNodeStyle(ev.target.id, {
            width: ev.target.style.width,
            height: ev.target.style.height
        });
    });
    store.saveHistory();
};

const onRotateGroup = ({ events }: any) => {
    events.forEach((ev: any) => {
        ev.target.style.transform = ev.transform;
    });
};

const onRotateGroupEnd = ({ events }: any) => {
    events.forEach((ev: any) => {
        store.updateNodeStyle(ev.target.id, {
            transform: ev.target.style.transform
        });
    });
    store.saveHistory();
};

watch(() => store.selectedNodeIds, () => {
  nextTick(updateTarget);
}, { deep: true });

</script>

<style scoped>
.canvas-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-color);
  background-image:
    linear-gradient(to right, rgba(17, 24, 39, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(17, 24, 39, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  position: relative;
  cursor: default;
}

.editor-canvas {
  position: absolute;
  top: 50px;
  left: 50px;
  transform-origin: 0 0;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(17, 24, 39, 0.08);
  box-shadow: var(--shadow-lg);
  background-image: none;
  transition: box-shadow 0.3s ease;
}
.editor-canvas.preview-mode {
  box-shadow: var(--shadow-md);
}

/* Moveable 样式优化 */
:deep(.moveable-control) {
  width: calc(10px / var(--zoom)) !important;
  height: calc(10px / var(--zoom)) !important;
  background: #fff !important;
  border: calc(1.5px / var(--zoom)) solid var(--primary-color) !important;
  border-radius: 50% !important;
  margin-top: calc(-5px / var(--zoom)) !important;
  margin-left: calc(-5px / var(--zoom)) !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
}
:deep(.moveable-line) {
  background: var(--primary-color) !important;
  width: calc(1px / var(--zoom)) !important;
}
:deep(.moveable-area) {
  background: transparent !important;
  border: none !important;
  outline: none !important;
}
:deep(.moveable-guideline) {
  background: var(--primary-color) !important;
  opacity: 0.8 !important;
  z-index: 100 !important;
}
:deep(.moveable-guideline.horizontal) {
  height: calc(1.5px / var(--zoom)) !important;
}
:deep(.moveable-guideline.vertical) {
  width: calc(1.5px / var(--zoom)) !important;
}
/* 辅助线数字样式 */
:deep(.moveable-snap-digit) {
  color: #fff !important;
  background: var(--primary-color) !important;
  padding: calc(2px / var(--zoom)) calc(4px / var(--zoom)) !important;
  border-radius: calc(2px / var(--zoom)) !important;
  font-size: calc(11px / var(--zoom)) !important;
  line-height: 1 !important;
  font-weight: 500 !important;
  pointer-events: none !important;
  white-space: nowrap !important;
  transform: translate(-50%, -50%) !important;
}
:deep(.moveable-rotation-line) {
  background: var(--primary-color) !important;
  width: calc(1px / var(--zoom)) !important;
}
:deep(.moveable-origin) {
  display: none !important;
}

.distance-guide-line {
  background: var(--primary-color);
  opacity: 0.9;
  z-index: 10000;
  pointer-events: none;
}

.distance-guide-label {
  color: #fff;
  background: var(--primary-color);
  padding: calc(2px / var(--zoom)) calc(4px / var(--zoom));
  border-radius: calc(2px / var(--zoom));
  font-size: calc(11px / var(--zoom));
  line-height: 1;
  font-weight: 500;
  z-index: 10001;
  pointer-events: none;
  white-space: nowrap;
}
</style>
