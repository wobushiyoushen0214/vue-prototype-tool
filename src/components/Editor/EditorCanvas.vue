<template>
  <div class="canvas-wrapper" 
       ref="wrapperRef"
       @mousedown="handleWrapperMouseDown"
       @mousemove="handleMouseMove"
       @wheel="handleWheel"
       @contextmenu.prevent="handleContextMenu($event)"
  >
    <div 
      class="viewport"
      :style="{
        transform: `scale(${store.zoom}) translate(${store.offset.x}px, ${store.offset.y}px)`,
        transformOrigin: '0 0',
        width: '100%',
        height: '100%',
        '--zoom': store.zoom
      }"
    >
      <div 
        v-for="scene in store.scenes"
        :key="scene.id"
        class="editor-canvas" 
        :data-scene-id="scene.id"
        :class="{ 
          'preview-mode': store.mode === 'preview',
          'is-active': scene.id === store.currentSceneId,
          'is-selected': store.selectedSceneIds.includes(scene.id),
          'is-dragging': isDraggingScene && (dragSceneId === scene.id || store.selectedSceneIds.includes(scene.id))
        }"
        :ref="el => { if (scene.id === store.currentSceneId) canvasRef = el as HTMLElement }"
        @dragover.prevent
        @drop="handleDrop($event, scene.id)"
        @mousedown="handleCanvasClick($event, scene.id)"
        @contextmenu.prevent.stop="handleContextMenu($event, scene.id)"
        @node-mousedown="handleNodeMouseDown"
        @node-contextmenu="handleNodeContextMenu"
        :style="{
          position: 'absolute',
          left: (scene.x || 0) + 'px',
          top: (scene.y || 0) + 'px',
          width: scene.config.width + 'px',
          height: scene.config.height + 'px',
          backgroundColor: scene.config.backgroundColor,
          zIndex: scene.id === store.currentSceneId ? 100 : (store.selectedSceneIds.includes(scene.id) ? 50 : 1),
          boxShadow: scene.id === store.currentSceneId 
            ? '0 0 0 2px var(--primary-color), 0 20px 50px rgba(0,0,0,0.15)' 
            : '0 4px 12px rgba(0,0,0,0.08)',
          opacity: 1,
          transition: isDraggingScene && (dragSceneId === scene.id || store.selectedSceneIds.includes(scene.id)) 
            ? 'none' 
            : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'auto'
        }"
      >
        <div v-if="scene.id !== store.currentSceneId" class="canvas-inactive-label-tag">
          <div class="scene-label">{{ scene.name || '未命名场景' }}</div>
        </div>
        <template v-if="scene.id === store.currentSceneId">
          <EditorNodeRenderer
            v-for="node in store.treeNodes"
            :key="node.id"
            :node="node"
          />
        </template>
        <template v-else>
          <EditorNodeRenderer
            v-for="node in store.getSceneTreeNodes(scene.nodes)"
            :key="node.id"
            :node="node"
          />
        </template>

        <!-- 标注 -->
        <template v-if="store.mode === 'preview' && scene.id === store.currentSceneId">
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

        <!-- 多选/单选控制 (仅对激活画布显示) -->
        <Moveable
          v-if="scene.id === store.currentSceneId && (targetElements.length > 0 || targetElement) && store.mode === 'edit' && !lockedSelected"
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
          :verticalGuidelines="[0, scene.config.width]"
          :horizontalGuidelines="[0, scene.config.height]"
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

    <!-- 画布右键菜单 -->
    <div 
      v-if="contextMenu.show" 
      class="canvas-context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
      @mousedown.stop
      @mouseup.stop
      @contextmenu.prevent
    >
      <template v-if="contextMenu.nodeId">
        <div class="menu-header">组件操作</div>
        <div class="menu-item" @click="handleContextAction('copy-node')">
          <el-icon><CopyDocument /></el-icon>
          <span>复制组件</span>
        </div>
        <div class="menu-item" @click="handleContextAction('cut-node')">
          <el-icon><Scissor /></el-icon>
          <span>剪切组件</span>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="handleContextAction('to-front')">
          <el-icon><CaretTop /></el-icon>
          <span>置顶</span>
        </div>
        <div class="menu-item" @click="handleContextAction('to-back')">
          <el-icon><CaretBottom /></el-icon>
          <span>置底</span>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item danger" @click="handleContextAction('delete-node')">
          <el-icon><Delete /></el-icon>
          <span>删除组件</span>
        </div>
      </template>
      <template v-else-if="contextMenu.sceneId">
        <div class="menu-header">画布操作</div>
        <div class="menu-item" @click="handleContextAction('copy')">
          <el-icon><CopyDocument /></el-icon>
          <span>复制画布</span>
        </div>
        <div class="menu-item" @click="handleContextAction('paste')" :class="{ disabled: !store.sceneClipboard }">
          <el-icon><DocumentAdd /></el-icon>
          <span>粘贴为新画布</span>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="handleContextAction('lock')">
          <el-icon><Lock v-if="store.scenes.find(s => s.id === contextMenu.sceneId)?.config.lockSize" /><Unlock v-else /></el-icon>
          <span>{{ store.scenes.find(s => s.id === contextMenu.sceneId)?.config.lockSize ? '解锁尺寸' : '锁定尺寸' }}</span>
        </div>
        <div class="menu-item danger" @click="handleContextAction('delete')" :class="{ disabled: store.scenes.length <= 1 }">
          <el-icon><Delete /></el-icon>
          <span>删除画布</span>
        </div>
      </template>
      <template v-else>
        <div class="menu-item" @click="handleContextAction('add')">
          <el-icon><Plus /></el-icon>
          <span>新建画布</span>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="handleContextAction('paste')" :class="{ disabled: !store.sceneClipboard }">
          <el-icon><DocumentAdd /></el-icon>
          <span>在此处粘贴画布</span>
        </div>
      </template>
    </div>

    <!-- 框选框渲染 -->
    <div 
      v-if="isSelecting" 
      class="selection-box" 
      :style="selectionBoxStyle"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue';
import { useEditorStore } from '@/store/editor';
import Moveable from 'vue3-moveable';
import EditorNodeRenderer from '@/components/Editor/EditorNodeRenderer.vue';
import AnnotationMarker from '@/components/Editor/AnnotationMarker.vue';
import { 
  CopyDocument, 
  Lock, 
  Unlock, 
  Delete, 
  Plus, 
  DocumentAdd, 
  Scissor, 
  CaretTop, 
  CaretBottom 
} from '@element-plus/icons-vue';
import { throttle } from 'lodash-es';

const store = useEditorStore();
const canvasRef = ref<HTMLElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
const targetElement = ref<HTMLElement | null>(null);
const targetElements = ref<HTMLElement[]>([]);
const lockedSelected = ref(false);
const centeredProjectId = ref<string>('');

const centerViewportOnCurrentScene = () => {
  const wrapper = wrapperRef.value;
  if (!wrapper) return;
  const scene = store.scenes.find(s => s.id === store.currentSceneId) || store.scenes[0];
  if (!scene) return;
  const rect = wrapper.getBoundingClientRect();
  const zoom = store.zoom || 1;
  const sceneX = scene.x ?? 0;
  const sceneY = scene.y ?? 0;
  const targetX = sceneX + scene.config.width / 2;
  const targetY = sceneY + scene.config.height / 2;
  store.setOffset({
    x: rect.width / (2 * zoom) - targetX,
    y: rect.height / (2 * zoom) - targetY
  });
};

watch(
  () => store.currentProjectId,
  async (id) => {
    if (!id) return;
    if (centeredProjectId.value === id) return;
    await nextTick();
    centerViewportOnCurrentScene();
    centeredProjectId.value = id;
  },
  { immediate: true }
);

type DistanceGuide = { lineStyle: Record<string, string>; labelStyle: Record<string, string>; label: string };
const distanceGuides = ref<DistanceGuide[]>([]);

// Pan state
let isPanning = false;
let startX = 0;
let startY = 0;
let initialOffset = { x: 0, y: 0 };
const spacePressed = ref(false);

// Mouse position for pasting
const lastMousePos = ref({ x: 0, y: 0 });

// Selection state
const isSelecting = ref(false);
const selectionStart = ref({ x: 0, y: 0 });
const selectionEnd = ref({ x: 0, y: 0 });

// Context Menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  sceneId: '',
  nodeId: ''
});

const handleContextMenu = (e: MouseEvent | { clientX: number, clientY: number, shiftKey?: boolean }, sceneId?: string, nodeId?: string) => {
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    sceneId: sceneId || '',
    nodeId: nodeId || ''
  };
  
  const isShift = 'shiftKey' in e ? e.shiftKey : false;

  // 如果是在特定画布上右键，且该画布未被选中，则选中它
  if (sceneId && !store.selectedSceneIds.includes(sceneId)) {
    store.selectScene(sceneId, isShift);
  }

  // 如果是在特定节点上右键，且该节点未被选中，则选中它
  if (nodeId && !store.selectedNodeIds.includes(nodeId)) {
    store.selectNode(nodeId, isShift);
  }
};

const closeContextMenu = () => {
  contextMenu.value.show = false;
};

const handleContextAction = (action: string) => {
  const sceneId = contextMenu.value.sceneId;

  switch (action) {
    case 'copy':
      if (sceneId) store.copySelectedScenesToClipboard();
      break;
    case 'add':
      if (wrapperRef.value) {
        const rect = wrapperRef.value.getBoundingClientRect();
        const x = (contextMenu.value.x - rect.left) / store.zoom - store.offset.x;
        const y = (contextMenu.value.y - rect.top) / store.zoom - store.offset.y;
        store.addScene(undefined, undefined, { x, y });
      }
      break;
    case 'paste':
      if (wrapperRef.value) {
        const rect = wrapperRef.value.getBoundingClientRect();
        const x = (contextMenu.value.x - rect.left) / store.zoom - store.offset.x;
        const y = (contextMenu.value.y - rect.top) / store.zoom - store.offset.y;
        store.pasteSceneFromClipboard({ x, y });
      }
      break;
    case 'delete':
      if (sceneId) store.deleteScene(sceneId);
      break;
    case 'lock':
      if (sceneId) store.toggleSceneLock(sceneId);
      break;
    case 'copy-node':
      store.copyNodes();
      break;
    case 'cut-node':
      store.cutNodes();
      break;
    case 'delete-node':
      store.deleteSelectedNodes();
      break;
    case 'to-front':
      store.bringToFront();
      break;
    case 'to-back':
      store.sendToBack();
      break;
  }
  closeContextMenu();
};

// 画布拖拽状态
const isDraggingScene = ref(false);
let dragSceneId: string | null = null;
let dragStartPos = { x: 0, y: 0 };
let initialScenePos = { x: 0, y: 0 };

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

const handleDrop = (e: DragEvent, sceneId?: string) => {
  if (sceneId && sceneId !== store.currentSceneId) {
    store.switchScene(sceneId);
  }
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
const handleNodeMouseDown = () => {
    // 逻辑已在 EditorNodeRenderer 中处理了 selectNode
    // 这里主要是为了确保 Moveable 目标更新
    nextTick(updateTarget);
};

const handleNodeContextMenu = (e: Event) => {
    const customEvent = e as CustomEvent<{ id: string, originalEvent: MouseEvent }>;
    const { id, originalEvent } = customEvent.detail;
    handleContextMenu(originalEvent, undefined, id);
};

const handleCanvasClick = (e: MouseEvent, sceneId?: string) => {
  if (sceneId && sceneId !== store.currentSceneId) {
    store.switchScene(sceneId);
  }

  if (store.mode === 'preview' && e.altKey && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const x = (e.clientX - rect.left) / store.zoom;
    const y = (e.clientY - rect.top) / store.zoom;
    store.addAnnotation({ x, y, content: '' });
    return;
  }
  
  // 如果是按住空格或中键，不清除选中
  if (e.button === 1 || spacePressed.value) return;
  
  // 左键点击画布：处理画布移动
  if (e.button === 0 && store.mode === 'edit') {
    const target = e.target as HTMLElement;
    const isNode = target.closest('.editor-node');
    const isMoveable = target.closest('.moveable-control') || target.closest('.moveable-line');
    
    // 如果不是点击组件或控制点
    if (!isNode && !isMoveable) {
      isDraggingScene.value = true;
      dragSceneId = sceneId || store.currentSceneId;
      const scene = store.scenes.find(s => s.id === dragSceneId);
      if (scene) {
        // 如果点击的画布不在选中列表中，且没按 shift，则设为唯一选中
        if (!store.selectedSceneIds.includes(dragSceneId) && !e.shiftKey) {
          store.selectScene(dragSceneId);
        } else if (e.shiftKey) {
          store.selectScene(dragSceneId, true);
        }

        dragStartPos = { x: e.clientX, y: e.clientY };
        initialScenePos = { x: scene.x || 0, y: scene.y || 0 };
        
        window.addEventListener('mousemove', handleSceneDragMove);
        window.addEventListener('mouseup', handleSceneDragUp);
        e.stopPropagation(); 
        return;
      }
    }
  }

  // 点击空白处，清除选中
  // 只有在没有按修饰键时才清除
  if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      store.clearSelection();
      targetElement.value = null;
      targetElements.value = [];
  }
};

const handleSceneDragMove = (e: MouseEvent) => {
  if (!isDraggingScene.value || !dragSceneId) return;
  
  const dx = (e.clientX - dragStartPos.x) / store.zoom;
  const dy = (e.clientY - dragStartPos.y) / store.zoom;
  
  // 如果当前拖拽的画布在选中列表中，则移动所有选中的画布
  if (store.selectedSceneIds.includes(dragSceneId)) {
    store.updateSelectedScenesPosition(dx, dy);
  } else {
    // 否则只移动当前拖拽的画布
    const scene = store.scenes.find(s => s.id === dragSceneId);
    if (scene) {
      store.updateScenePosition(dragSceneId, initialScenePos.x + dx, initialScenePos.y + dy);
    }
  }
  
  // 更新起始位置以便增量移动（如果是多选）
  if (store.selectedSceneIds.includes(dragSceneId)) {
    dragStartPos = { x: e.clientX, y: e.clientY };
  }
};

const handleSceneDragUp = () => {
  isDraggingScene.value = false;
  dragSceneId = '';
  window.removeEventListener('mousemove', handleSceneDragMove);
  window.removeEventListener('mouseup', handleSceneDragUp);
  store.saveHistory();
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
  // 实时记录鼠标在画布坐标系中的位置
  if (wrapperRef.value) {
    const rect = wrapperRef.value.getBoundingClientRect();
    // 转换为视口坐标系（考虑 zoom 和 offset）
    lastMousePos.value = {
      x: (e.clientX - rect.left) / store.zoom - store.offset.x,
      y: (e.clientY - rect.top) / store.zoom - store.offset.y
    };
  }

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

const calculateSelection = (e: MouseEvent) => {
    const left = Math.min(selectionStart.value.x, selectionEnd.value.x);
    const top = Math.min(selectionStart.value.y, selectionEnd.value.y);
    const right = Math.max(selectionStart.value.x, selectionEnd.value.x);
    const bottom = Math.max(selectionStart.value.y, selectionEnd.value.y);
    
    // 如果选区太小，认为是普通点击，不执行框选
    if (right - left < 5 && bottom - top < 5) return;

    const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;

    // 1. 检查是否选中了组件
    const nodeElements = document.querySelectorAll('.editor-node');
    const selectedNodeIds: string[] = [];
    nodeElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
            selectedNodeIds.push(el.id);
        }
    });

    // 2. 检查是否选中了画布
    const canvasElements = document.querySelectorAll('.editor-canvas');
    const selectedSceneIds: string[] = [];
    canvasElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const sceneId = (el as HTMLElement).dataset.sceneId;
        if (sceneId && rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
            selectedSceneIds.push(sceneId);
        }
    });

    if (selectedNodeIds.length > 0) {
        // 如果没有按住多选键，清除画布选中
        if (!isMultiSelect) store.clearSceneSelection();
        
        selectedNodeIds.forEach(id => store.selectNode(id, true));
    } else if (selectedSceneIds.length > 0) {
        // 如果选中了画布且没有组件
        selectedSceneIds.forEach(id => store.selectScene(id, true));
    }
};

const handleSelectionUp = (e: MouseEvent) => {
    if (!isSelecting.value) return;
    isSelecting.value = false;
    window.removeEventListener('mousemove', handleSelectionMove);
    window.removeEventListener('mouseup', handleSelectionUp);
    
    calculateSelection(e);
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
  const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable;
  if (isInput) return;

  const isMod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  // 空格键平移
  if (e.code === 'Space' && !e.repeat) {
    spacePressed.value = true;
    if (wrapperRef.value) wrapperRef.value.style.cursor = 'grab';
  }

  // 快捷键复制
  if (isMod && key === 'c') {
    if (store.selectedNodeIds.length > 0) {
      store.copyNodes();
      e.preventDefault();
      e.stopPropagation();
    } else if (store.selectedSceneIds.length > 0) {
      store.copySelectedScenesToClipboard();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // 快捷键剪切
  if (isMod && key === 'x') {
    if (store.selectedNodeIds.length > 0) {
      store.cutNodes();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // 快捷键粘贴
  if (isMod && key === 'v') {
    if (store.clipboard && store.clipboard.length > 0) {
      store.pasteNodes();
      e.preventDefault();
      e.stopPropagation();
    } else if (store.sceneClipboard) {
      store.pasteSceneFromClipboard(lastMousePos.value);
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // 撤销重做
  if (isMod && key === 'z') {
    if (e.shiftKey) {
      store.redo();
    } else {
      store.undo();
    }
    e.preventDefault();
    e.stopPropagation();
  }
  
  if (isMod && key === 'y') {
    store.redo();
    e.preventDefault();
    e.stopPropagation();
  }

  // 删除
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedNodeIds.length > 0) {
      store.deleteSelectedNodes();
      e.preventDefault();
    } else if (store.selectedSceneIds.length > 0) {
      store.selectedSceneIds.forEach(id => {
        if (store.scenes.length > 1) {
          store.deleteScene(id);
        }
      });
      e.preventDefault();
    }
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
  window.addEventListener('mousedown', closeContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('mousedown', closeContextMenu);
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

  for (const el of others) {
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
  }

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

.viewport {
  position: absolute;
  top: 0;
  left: 0;
}

.editor-canvas {
  position: absolute;
  flex-shrink: 0;
  border-radius: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-image: none;
  overflow: hidden;
}

.canvas-inactive-label-tag {
   position: absolute;
   top: -40px;
   left: 0;
   display: flex;
   align-items: center;
   z-index: 100;
   cursor: pointer;
 }
 
 .scene-label {
   padding: 4px 12px;
   background: var(--primary-color);
   border-radius: 4px 4px 0 0;
   font-size: 12px;
   font-weight: 600;
   color: white;
   box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
   white-space: nowrap;
   transform: scale(calc(1 / var(--zoom)));
   transform-origin: left bottom;
 }
.editor-canvas.preview-mode {
  box-shadow: var(--shadow-md);
}

.selection-box {
  position: fixed;
  border: 1px solid var(--primary-color);
  background-color: rgba(37, 99, 235, 0.1);
  z-index: 9999;
  pointer-events: none;
}

.canvas-context-menu {
  position: fixed;
  z-index: 3000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1);
  padding: 6px;
  min-width: 160px;
  user-select: none;
  border: 1px solid #f0f0f0;
}

.menu-header {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-color);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.menu-item:hover:not(.disabled) {
  background-color: var(--bg-color-hover);
  color: var(--primary-color);
}

.menu-item.danger {
  color: var(--el-color-danger);
}

.menu-item.danger:hover:not(.disabled) {
  background-color: var(--el-color-danger-light-9);
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.menu-item el-icon {
  font-size: 16px;
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
