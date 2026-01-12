<template>
  <div class="canvas-wrapper" 
       ref="wrapperRef"
       @mousedown="handleWrapperMouseDown"
       @mousemove="handleMouseMove"
       @wheel="handleWheel"
       @contextmenu.prevent="handleContextMenu($event)"
  >
    <template v-if="store.mode === 'edit' && store.view.showRulers">
      <div class="ruler-corner"></div>
      <div class="ruler ruler-x" @mousedown.stop="startCreateGuide('vertical', $event)">
        <div
          v-for="t in xTicks"
          :key="t.value"
          class="ruler-tick"
          :style="{ left: `${t.pos}px` }"
        >
          <div class="ruler-tick-line"></div>
          <span class="ruler-tick-label">{{ t.label }}</span>
        </div>
      </div>
      <div class="ruler ruler-y" @mousedown.stop="startCreateGuide('horizontal', $event)">
        <div
          v-for="t in yTicks"
          :key="t.value"
          class="ruler-tick ruler-tick-y"
          :style="{ top: `${t.pos}px` }"
        >
          <div class="ruler-tick-line"></div>
          <span class="ruler-tick-label">{{ t.label }}</span>
        </div>
      </div>
    </template>

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
          :snappable="store.snap.enabled"
          :snapCenter="true"
          :snapHorizontal="true"
          :snapVertical="true"
          :snapElement="true"
          :elementGuidelines="elementGuidelines"
          :snapThreshold="store.snap.threshold"
          :isDisplaySnapDigit="store.snap.showSnapDigits"
          :verticalGuidelines="sceneVerticalGuidelines"
          :horizontalGuidelines="sceneHorizontalGuidelines"
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

    <template v-if="store.mode === 'edit' && store.view.showGuides">
      <template v-for="g in renderedGuides.vertical" :key="`v-${g.pos}`">
        <div
          class="canvas-guide canvas-guide-vertical"
          :style="g.style"
          @mousedown.stop="startDragGuide('vertical', g.pos, $event)"
          @contextmenu.prevent.stop="handleContextMenu($event, store.currentSceneId, '', { direction: 'vertical', pos: g.pos })"
        ></div>
      </template>
      <template v-for="g in renderedGuides.horizontal" :key="`h-${g.pos}`">
        <div
          class="canvas-guide canvas-guide-horizontal"
          :style="g.style"
          @mousedown.stop="startDragGuide('horizontal', g.pos, $event)"
          @contextmenu.prevent.stop="handleContextMenu($event, store.currentSceneId, '', { direction: 'horizontal', pos: g.pos })"
        ></div>
      </template>
      <div
        v-if="creatingGuide && creatingGuidePos !== null"
        class="canvas-guide-preview"
        :class="creatingGuide.direction === 'vertical' ? 'is-vertical' : 'is-horizontal'"
        :style="creatingGuideStyle"
      ></div>
      <div
        v-if="draggingGuide && draggingGuidePos !== null"
        class="canvas-guide-preview"
        :class="draggingGuide.direction === 'vertical' ? 'is-vertical' : 'is-horizontal'"
        :style="draggingGuideStyle"
      ></div>
    </template>

    <!-- 框选矩形 -->
    <div 
      v-if="isSelecting" 
      class="selection-box"
      :style="selectionBoxStyle"
    ></div>
    <template v-if="store.snap.showDistanceGuides && distanceGuides.length">
      <template v-for="(g, idx) in distanceGuides" :key="idx">
        <div class="distance-guide-line" :class="`is-${g.orientation}`" :style="g.lineStyle"></div>
        <template v-if="g.caps && g.caps.length">
          <div
            v-for="(c, cidx) in g.caps"
            :key="`${idx}-${cidx}`"
            class="distance-guide-cap"
            :style="c.style"
          ></div>
        </template>
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
      <template v-else-if="contextMenu.guide">
        <div class="menu-header">参考线</div>
        <div class="menu-item danger" @click="handleContextAction('delete-guide')">
          <el-icon><Delete /></el-icon>
          <span>删除参考线</span>
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
const wrapperRect = ref<DOMRect | null>(null);
const RULER_SIZE = 20;

const activeScene = computed(() => {
  return store.scenes.find(s => s.id === store.currentSceneId) || null;
});

const updateWrapperRect = () => {
  if (!wrapperRef.value) return;
  wrapperRect.value = wrapperRef.value.getBoundingClientRect();
};

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

type DistanceGuide = {
  orientation: 'horizontal' | 'vertical';
  lineStyle: Record<string, string>;
  labelStyle: Record<string, string>;
  label: string;
  caps?: { style: Record<string, string> }[];
};
const distanceGuides = ref<DistanceGuide[]>([]);

type Tick = { value: number; pos: number; label: number };

const pickRulerStep = (zoom: number) => {
  const candidates = [5, 10, 20, 50, 100, 200, 500];
  const minPx = 50;
  for (const c of candidates) {
    if (c * zoom >= minPx) return c;
  }
  return 500;
};

const wrapperToSceneX = (localX: number) => {
  const scene = activeScene.value;
  if (!scene) return 0;
  const originX = scene.x ?? 0;
  return localX / store.zoom - store.offset.x - originX;
};

const wrapperToSceneY = (localY: number) => {
  const scene = activeScene.value;
  if (!scene) return 0;
  const originY = scene.y ?? 0;
  return localY / store.zoom - store.offset.y - originY;
};

const sceneToWrapperX = (sceneX: number) => {
  const scene = activeScene.value;
  if (!scene) return 0;
  const originX = scene.x ?? 0;
  return (sceneX + originX + store.offset.x) * store.zoom;
};

const sceneToWrapperY = (sceneY: number) => {
  const scene = activeScene.value;
  if (!scene) return 0;
  const originY = scene.y ?? 0;
  return (sceneY + originY + store.offset.y) * store.zoom;
};

const xTicks = computed<Tick[]>(() => {
  const rect = wrapperRect.value;
  const scene = activeScene.value;
  if (!rect || !scene) return [];
  const step = pickRulerStep(store.zoom);

  const startVal = Math.floor(wrapperToSceneX(0) / step) * step - step * 2;
  const endVal = Math.ceil(wrapperToSceneX(rect.width) / step) * step + step * 2;

  const ticks: Tick[] = [];
  for (let v = startVal; v <= endVal; v += step) {
    ticks.push({
      value: v,
      pos: sceneToWrapperX(v) - RULER_SIZE,
      label: Math.round(v),
    });
  }
  return ticks;
});

const yTicks = computed<Tick[]>(() => {
  const rect = wrapperRect.value;
  const scene = activeScene.value;
  if (!rect || !scene) return [];
  const step = pickRulerStep(store.zoom);

  const startVal = Math.floor(wrapperToSceneY(0) / step) * step - step * 2;
  const endVal = Math.ceil(wrapperToSceneY(rect.height) / step) * step + step * 2;

  const ticks: Tick[] = [];
  for (let v = startVal; v <= endVal; v += step) {
    ticks.push({
      value: v,
      pos: sceneToWrapperY(v) - RULER_SIZE,
      label: Math.round(v),
    });
  }
  return ticks;
});

const sceneVerticalGuidelines = computed(() => {
  const scene = activeScene.value;
  if (!scene) return [];
  const extra = scene.guides?.vertical ?? [];
  const set = new Set<number>([0, scene.config.width, ...extra]);
  return Array.from(set).sort((a, b) => a - b);
});

const sceneHorizontalGuidelines = computed(() => {
  const scene = activeScene.value;
  if (!scene) return [];
  const extra = scene.guides?.horizontal ?? [];
  const set = new Set<number>([0, scene.config.height, ...extra]);
  return Array.from(set).sort((a, b) => a - b);
});

const renderedGuides = computed(() => {
  const rect = wrapperRect.value;
  const scene = activeScene.value;
  if (!rect || !scene) return { vertical: [] as { pos: number; style: Record<string, string> }[], horizontal: [] as { pos: number; style: Record<string, string> }[] };
  const sx = sceneToWrapperX(0);
  const sy = sceneToWrapperY(0);
  const sw = scene.config.width * store.zoom;
  const sh = scene.config.height * store.zoom;
  const vertical = (scene.guides?.vertical ?? []).map(pos => ({
    pos,
    style: {
      left: `${sx + pos * store.zoom}px`,
      top: `${sy}px`,
      height: `${sh}px`,
      width: `calc(1.5px / var(--zoom))`,
    },
  }));
  const horizontal = (scene.guides?.horizontal ?? []).map(pos => ({
    pos,
    style: {
      left: `${sx}px`,
      top: `${sy + pos * store.zoom}px`,
      width: `${sw}px`,
      height: `calc(1.5px / var(--zoom))`,
    },
  }));
  return { vertical, horizontal };
});

const creatingGuide = ref<{ direction: 'vertical' | 'horizontal' } | null>(null);
const creatingGuidePos = ref<number | null>(null);
const draggingGuide = ref<{ direction: 'vertical' | 'horizontal'; from: number } | null>(null);
const draggingGuidePos = ref<number | null>(null);

const getLocalPoint = (e: MouseEvent) => {
  const rect = wrapperRect.value;
  if (!rect) return { x: 0, y: 0 };
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

const creatingGuideStyle = computed(() => {
  const scene = activeScene.value;
  if (!scene || !creatingGuide.value || creatingGuidePos.value === null) return {};
  const sx = sceneToWrapperX(0);
  const sy = sceneToWrapperY(0);
  const sw = scene.config.width * store.zoom;
  const sh = scene.config.height * store.zoom;
  if (creatingGuide.value.direction === 'vertical') {
    return {
      left: `${sx + creatingGuidePos.value * store.zoom}px`,
      top: `${sy}px`,
      height: `${sh}px`,
      width: `calc(1.5px / var(--zoom))`,
    };
  }
  return {
    left: `${sx}px`,
    top: `${sy + creatingGuidePos.value * store.zoom}px`,
    width: `${sw}px`,
    height: `calc(1.5px / var(--zoom))`,
  };
});

const draggingGuideStyle = computed(() => {
  const scene = activeScene.value;
  if (!scene || !draggingGuide.value || draggingGuidePos.value === null) return {};
  const sx = sceneToWrapperX(0);
  const sy = sceneToWrapperY(0);
  const sw = scene.config.width * store.zoom;
  const sh = scene.config.height * store.zoom;
  if (draggingGuide.value.direction === 'vertical') {
    return {
      left: `${sx + draggingGuidePos.value * store.zoom}px`,
      top: `${sy}px`,
      height: `${sh}px`,
      width: `calc(1.5px / var(--zoom))`,
    };
  }
  return {
    left: `${sx}px`,
    top: `${sy + draggingGuidePos.value * store.zoom}px`,
    width: `${sw}px`,
    height: `calc(1.5px / var(--zoom))`,
  };
});

const startCreateGuide = (direction: 'vertical' | 'horizontal', e: MouseEvent) => {
  if (!store.view.showGuides) return;
  const scene = activeScene.value;
  if (!scene) return;
  updateWrapperRect();
  creatingGuide.value = { direction };
  const p = getLocalPoint(e);
  creatingGuidePos.value = direction === 'vertical' ? wrapperToSceneX(p.x) : wrapperToSceneY(p.y);
  window.addEventListener('mousemove', onCreateGuideMove);
  window.addEventListener('mouseup', onCreateGuideUp);
};

const onCreateGuideMove = (e: MouseEvent) => {
  if (!creatingGuide.value) return;
  updateWrapperRect();
  const p = getLocalPoint(e);
  if (creatingGuide.value.direction === 'vertical') {
    creatingGuidePos.value = wrapperToSceneX(p.x);
  } else {
    creatingGuidePos.value = wrapperToSceneY(p.y);
  }
};

const onCreateGuideUp = () => {
  const scene = activeScene.value;
  if (creatingGuide.value && creatingGuidePos.value !== null && scene) {
    const pos = creatingGuidePos.value;
    if (creatingGuide.value.direction === 'vertical') {
      if (pos >= 0 && pos <= scene.config.width) store.addGuide(scene.id, 'vertical', pos);
    } else {
      if (pos >= 0 && pos <= scene.config.height) store.addGuide(scene.id, 'horizontal', pos);
    }
  }
  creatingGuide.value = null;
  creatingGuidePos.value = null;
  window.removeEventListener('mousemove', onCreateGuideMove);
  window.removeEventListener('mouseup', onCreateGuideUp);
};

const startDragGuide = (direction: 'vertical' | 'horizontal', pos: number, e: MouseEvent) => {
  if (!store.view.showGuides) return;
  const scene = activeScene.value;
  if (!scene) return;
  updateWrapperRect();
  draggingGuide.value = { direction, from: pos };
  const p = getLocalPoint(e);
  draggingGuidePos.value = direction === 'vertical' ? wrapperToSceneX(p.x) : wrapperToSceneY(p.y);
  window.addEventListener('mousemove', onDragGuideMove);
  window.addEventListener('mouseup', onDragGuideUp);
};

const onDragGuideMove = (e: MouseEvent) => {
  if (!draggingGuide.value) return;
  updateWrapperRect();
  const p = getLocalPoint(e);
  if (draggingGuide.value.direction === 'vertical') {
    draggingGuidePos.value = wrapperToSceneX(p.x);
  } else {
    draggingGuidePos.value = wrapperToSceneY(p.y);
  }
};

const onDragGuideUp = () => {
  const scene = activeScene.value;
  if (draggingGuide.value && draggingGuidePos.value !== null && scene) {
    const { direction, from } = draggingGuide.value;
    const pos = draggingGuidePos.value;
    const max = direction === 'vertical' ? scene.config.width : scene.config.height;
    if (pos < -20 || pos > max + 20) {
      store.removeGuide(scene.id, direction, from);
    } else {
      store.updateGuide(scene.id, direction, from, pos);
    }
  }
  draggingGuide.value = null;
  draggingGuidePos.value = null;
  window.removeEventListener('mousemove', onDragGuideMove);
  window.removeEventListener('mouseup', onDragGuideUp);
};

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
  nodeId: '',
  guide: null as null | { direction: 'vertical' | 'horizontal'; pos: number }
});

const handleContextMenu = (
  e: MouseEvent | { clientX: number; clientY: number; shiftKey?: boolean },
  sceneId?: string,
  nodeId?: string,
  guide?: { direction: 'vertical' | 'horizontal'; pos: number }
) => {
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    sceneId: sceneId || '',
    nodeId: nodeId || '',
    guide: guide || null
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
    case 'delete-guide': {
      const g = contextMenu.value.guide;
      if (sceneId && g) store.removeGuide(sceneId, g.direction, g.pos);
      break;
    }
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

const clampNumber = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
};

const clampTargetWithinParent = (target: HTMLElement, left: number, top: number) => {
  const offsetParent = target.offsetParent as HTMLElement | null;
  const parentW = offsetParent ? offsetParent.clientWidth : (activeScene.value?.config.width ?? 0);
  const parentH = offsetParent ? offsetParent.clientHeight : (activeScene.value?.config.height ?? 0);
  const w = target.offsetWidth;
  const h = target.offsetHeight;
  return {
    left: clampNumber(left, 0, Math.max(0, parentW - w)),
    top: clampNumber(top, 0, Math.max(0, parentH - h)),
  };
};

const buildDistanceGuides = (targetEl: HTMLElement, baseLeft: number, baseTop: number, gapPx: number) => {
  if (!store.snap.enabled || !store.snap.showDistanceGuides) {
    distanceGuides.value = [];
    return { left: baseLeft, top: baseTop };
  }
  const guides: DistanceGuide[] = [];
  const rect = targetEl.getBoundingClientRect();
  const canvasRect = canvasRef.value ? canvasRef.value.getBoundingClientRect() : null;
  const xMid = rect.left + rect.width / 2;
  const yMid = rect.top + rect.height / 2;

  const snapThresholdPx = store.snap.threshold;
  const thickness = 1.5 / store.zoom;
  const capLen = 8 / store.zoom;
  const capHalf = capLen / 2;

  const overlapMin = 6;
  const others = (Array.from(document.querySelectorAll('.editor-node')) as HTMLElement[])
    .filter(el => el !== targetEl)
    .filter(el => el.offsetParent !== null);

  const otherRects = others.map(el => ({ el, rect: el.getBoundingClientRect() }));

  const overlapY = (a: DOMRect, b: DOMRect) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  const overlapX = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left);

  const findNearestHorizontal = (direction: 'left' | 'right') => {
    let best: { el: HTMLElement; rect: DOMRect; distPx: number } | null = null;
    for (const o of otherRects) {
      if (overlapY(rect, o.rect) <= overlapMin) continue;
      if (direction === 'left') {
        const d = rect.left - o.rect.right;
        if (d >= 0 && (!best || d < best.distPx)) best = { ...o, distPx: d };
      } else {
        const d = o.rect.left - rect.right;
        if (d >= 0 && (!best || d < best.distPx)) best = { ...o, distPx: d };
      }
    }
    return best;
  };

  const findNearestVertical = (direction: 'top' | 'bottom') => {
    let best: { el: HTMLElement; rect: DOMRect; distPx: number } | null = null;
    for (const o of otherRects) {
      if (overlapX(rect, o.rect) <= overlapMin) continue;
      if (direction === 'top') {
        const d = rect.top - o.rect.bottom;
        if (d >= 0 && (!best || d < best.distPx)) best = { ...o, distPx: d };
      } else {
        const d = o.rect.top - rect.bottom;
        if (d >= 0 && (!best || d < best.distPx)) best = { ...o, distPx: d };
      }
    }
    return best;
  };

  const findNeighborGapRefHorizontal = (base: DOMRect, direction: 'left' | 'right') => {
    let best: { rect: DOMRect; distPx: number } | null = null;
    for (const o of otherRects) {
      if (overlapY(base, o.rect) <= overlapMin) continue;
      if (direction === 'right') {
        const d = o.rect.left - base.right;
        if (d >= 0 && (!best || d < best.distPx)) best = { rect: o.rect, distPx: d };
      } else {
        const d = base.left - o.rect.right;
        if (d >= 0 && (!best || d < best.distPx)) best = { rect: o.rect, distPx: d };
      }
    }
    return best?.distPx ?? null;
  };

  const findNeighborGapRefVertical = (base: DOMRect, direction: 'top' | 'bottom') => {
    let best: { rect: DOMRect; distPx: number } | null = null;
    for (const o of otherRects) {
      if (overlapX(base, o.rect) <= overlapMin) continue;
      if (direction === 'bottom') {
        const d = o.rect.top - base.bottom;
        if (d >= 0 && (!best || d < best.distPx)) best = { rect: o.rect, distPx: d };
      } else {
        const d = base.top - o.rect.bottom;
        if (d >= 0 && (!best || d < best.distPx)) best = { rect: o.rect, distPx: d };
      }
    }
    return best?.distPx ?? null;
  };

  const buildHorizontalGuide = (leftPx: number, rightPx: number, yPx: number, label: string) => {
    const xMin = Math.min(leftPx, rightPx);
    const xMax = Math.max(leftPx, rightPx);
    guides.push({
      orientation: 'horizontal',
      lineStyle: {
        position: 'fixed',
        left: `${xMin}px`,
        top: `${yPx}px`,
        width: `${Math.max(0, xMax - xMin)}px`,
        height: `${thickness}px`,
        transform: 'translateY(-50%)',
        backgroundImage:
          'repeating-linear-gradient(to right, var(--el-color-danger) 0, var(--el-color-danger) 6px, transparent 6px, transparent 10px)',
      },
      caps: [
        { style: { position: 'fixed', left: `${xMin}px`, top: `${yPx - capHalf}px`, width: `${thickness}px`, height: `${capLen}px` } },
        { style: { position: 'fixed', left: `${xMax}px`, top: `${yPx - capHalf}px`, width: `${thickness}px`, height: `${capLen}px` } },
      ],
      labelStyle: {
        position: 'fixed',
        left: `${(xMin + xMax) / 2}px`,
        top: `${yPx}px`,
        transform: 'translate(-50%, calc(-100% - 6px))',
      },
      label,
    });
  };

  const buildVerticalGuide = (topPx: number, bottomPx: number, xPx: number, label: string) => {
    const yMin = Math.min(topPx, bottomPx);
    const yMax = Math.max(topPx, bottomPx);
    guides.push({
      orientation: 'vertical',
      lineStyle: {
        position: 'fixed',
        left: `${xPx}px`,
        top: `${yMin}px`,
        width: `${thickness}px`,
        height: `${Math.max(0, yMax - yMin)}px`,
        transform: 'translateX(-50%)',
        backgroundImage:
          'repeating-linear-gradient(to bottom, var(--el-color-danger) 0, var(--el-color-danger) 6px, transparent 6px, transparent 10px)',
      },
      caps: [
        { style: { position: 'fixed', left: `${xPx - capHalf}px`, top: `${yMin}px`, width: `${capLen}px`, height: `${thickness}px` } },
        { style: { position: 'fixed', left: `${xPx - capHalf}px`, top: `${yMax}px`, width: `${capLen}px`, height: `${thickness}px` } },
      ],
      labelStyle: {
        position: 'fixed',
        left: `${xPx}px`,
        top: `${(yMin + yMax) / 2}px`,
        transform: 'translate(calc(-100% - 6px), -50%)',
      },
      label,
    });
  };

  const buildEdgeHorizontalGuide = (leftPx: number, rightPx: number, yPx: number, label: string, place: 'above' | 'below') => {
    const xMin = Math.min(leftPx, rightPx);
    const xMax = Math.max(leftPx, rightPx);
    const color = 'rgba(17, 24, 39, 0.55)';
    guides.push({
      orientation: 'horizontal',
      lineStyle: {
        position: 'fixed',
        left: `${xMin}px`,
        top: `${yPx}px`,
        width: `${Math.max(0, xMax - xMin)}px`,
        height: `${thickness}px`,
        transform: 'translateY(-50%)',
        backgroundImage: `repeating-linear-gradient(to right, ${color} 0, ${color} 6px, transparent 6px, transparent 10px)`,
      },
      caps: [
        { style: { position: 'fixed', left: `${xMin}px`, top: `${yPx - capHalf}px`, width: `${thickness}px`, height: `${capLen}px`, backgroundColor: color } },
        { style: { position: 'fixed', left: `${xMax}px`, top: `${yPx - capHalf}px`, width: `${thickness}px`, height: `${capLen}px`, backgroundColor: color } },
      ],
      labelStyle: {
        position: 'fixed',
        left: `${(xMin + xMax) / 2}px`,
        top: `${yPx}px`,
        transform: place === 'above' ? 'translate(-50%, calc(-100% - 6px))' : 'translate(-50%, 6px)',
        backgroundColor: 'rgba(17, 24, 39, 0.78)',
        color: '#fff',
      },
      label,
    });
  };

  const buildEdgeVerticalGuide = (topPx: number, bottomPx: number, xPx: number, label: string, place: 'left' | 'right') => {
    const yMin = Math.min(topPx, bottomPx);
    const yMax = Math.max(topPx, bottomPx);
    const color = 'rgba(17, 24, 39, 0.55)';
    guides.push({
      orientation: 'vertical',
      lineStyle: {
        position: 'fixed',
        left: `${xPx}px`,
        top: `${yMin}px`,
        width: `${thickness}px`,
        height: `${Math.max(0, yMax - yMin)}px`,
        transform: 'translateX(-50%)',
        backgroundImage: `repeating-linear-gradient(to bottom, ${color} 0, ${color} 6px, transparent 6px, transparent 10px)`,
      },
      caps: [
        { style: { position: 'fixed', left: `${xPx - capHalf}px`, top: `${yMin}px`, width: `${capLen}px`, height: `${thickness}px`, backgroundColor: color } },
        { style: { position: 'fixed', left: `${xPx - capHalf}px`, top: `${yMax}px`, width: `${capLen}px`, height: `${thickness}px`, backgroundColor: color } },
      ],
      labelStyle: {
        position: 'fixed',
        left: `${xPx}px`,
        top: `${(yMin + yMax) / 2}px`,
        transform: place === 'left' ? 'translate(calc(-100% - 6px), -50%)' : 'translate(6px, -50%)',
        backgroundColor: 'rgba(17, 24, 39, 0.78)',
        color: '#fff',
      },
      label,
    });
  };

  let nextLeft = baseLeft;
  let nextTop = baseTop;

  const candLeft = findNearestHorizontal('left');
  const candRight = findNearestHorizontal('right');
  const candTop = findNearestVertical('top');
  const candBottom = findNearestVertical('bottom');

  type SnapCandidate = { axis: 'x' | 'y'; score: number; delta: number; guide?: () => void };
  const snapCandidates: SnapCandidate[] = [];

  if (candLeft) {
    const currentGap = candLeft.distPx / store.zoom;
    const refGapPx = findNeighborGapRefHorizontal(candLeft.rect, 'right');
    const refGap = refGapPx !== null ? refGapPx / store.zoom : null;
    const desired = refGap !== null ? refGap : gapPx;
    const score = Math.abs(currentGap - desired);
    if (score <= snapThresholdPx) {
      const delta = desired - currentGap;
      snapCandidates.push({
        axis: 'x',
        score,
        delta,
        guide: () => {
          const y = Math.max(rect.top, candLeft.rect.top) + overlapY(rect, candLeft.rect) / 2;
          buildHorizontalGuide(candLeft.rect.right, rect.left, y, `${Math.round(desired)}px`);
        },
      });
    }
  }

  if (candRight) {
    const currentGap = candRight.distPx / store.zoom;
    const refGapPx = findNeighborGapRefHorizontal(candRight.rect, 'left');
    const refGap = refGapPx !== null ? refGapPx / store.zoom : null;
    const desired = refGap !== null ? refGap : gapPx;
    const score = Math.abs(currentGap - desired);
    if (score <= snapThresholdPx) {
      const delta = desired - currentGap;
      snapCandidates.push({
        axis: 'x',
        score,
        delta,
        guide: () => {
          const y = Math.max(rect.top, candRight.rect.top) + overlapY(rect, candRight.rect) / 2;
          buildHorizontalGuide(rect.right, candRight.rect.left, y, `${Math.round(desired)}px`);
        },
      });
    }
  }

  if (candTop) {
    const currentGap = candTop.distPx / store.zoom;
    const refGapPx = findNeighborGapRefVertical(candTop.rect, 'bottom');
    const refGap = refGapPx !== null ? refGapPx / store.zoom : null;
    const desired = refGap !== null ? refGap : gapPx;
    const score = Math.abs(currentGap - desired);
    if (score <= snapThresholdPx) {
      const delta = desired - currentGap;
      snapCandidates.push({
        axis: 'y',
        score,
        delta,
        guide: () => {
          const x = Math.max(rect.left, candTop.rect.left) + overlapX(rect, candTop.rect) / 2;
          buildVerticalGuide(candTop.rect.bottom, rect.top, x, `${Math.round(desired)}px`);
        },
      });
    }
  }

  if (candBottom) {
    const currentGap = candBottom.distPx / store.zoom;
    const refGapPx = findNeighborGapRefVertical(candBottom.rect, 'top');
    const refGap = refGapPx !== null ? refGapPx / store.zoom : null;
    const desired = refGap !== null ? refGap : gapPx;
    const score = Math.abs(currentGap - desired);
    if (score <= snapThresholdPx) {
      const delta = desired - currentGap;
      snapCandidates.push({
        axis: 'y',
        score,
        delta,
        guide: () => {
          const x = Math.max(rect.left, candBottom.rect.left) + overlapX(rect, candBottom.rect) / 2;
          buildVerticalGuide(rect.bottom, candBottom.rect.top, x, `${Math.round(desired)}px`);
        },
      });
    }
  }

  const bestX = snapCandidates.filter(c => c.axis === 'x').sort((a, b) => a.score - b.score)[0];
  const bestY = snapCandidates.filter(c => c.axis === 'y').sort((a, b) => a.score - b.score)[0];

  if (bestX) {
    nextLeft = baseLeft + bestX.delta;
    bestX.guide?.();
  }
  if (bestY) {
    nextTop = baseTop + bestY.delta;
    bestY.guide?.();
  }

  if (canvasRect) {
    const leftDist = Math.max(0, (rect.left - canvasRect.left) / store.zoom);
    const rightDist = Math.max(0, (canvasRect.right - rect.right) / store.zoom);
    const topDist = Math.max(0, (rect.top - canvasRect.top) / store.zoom);
    const bottomDist = Math.max(0, (canvasRect.bottom - rect.bottom) / store.zoom);

    buildEdgeHorizontalGuide(canvasRect.left, rect.left, yMid, `${Math.round(leftDist)}px`, 'above');
    buildEdgeHorizontalGuide(rect.right, canvasRect.right, yMid, `${Math.round(rightDist)}px`, 'below');
    buildEdgeVerticalGuide(canvasRect.top, rect.top, xMid, `${Math.round(topDist)}px`, 'left');
    buildEdgeVerticalGuide(rect.bottom, canvasRect.bottom, xMid, `${Math.round(bottomDist)}px`, 'right');
  }

  distanceGuides.value = guides;
  return { left: nextLeft, top: nextTop };
};

// Single Target Events
const onDrag = throttle(({ target, left, top }: any) => {
  let nextLeft = left;
  let nextTop = top;
  const snapped = buildDistanceGuides(target, nextLeft, nextTop, store.snap.gapPx);
  nextLeft = snapped.left;
  nextTop = snapped.top;

  if (!store.canvasAutoExpand) {
    const clamped = clampTargetWithinParent(target, nextLeft, nextTop);
    nextLeft = clamped.left;
    nextTop = clamped.top;
  }

  nextLeft = Math.round(nextLeft);
  nextTop = Math.round(nextTop);

  target.style.left = `${nextLeft}px`;
  target.style.top = `${nextTop}px`;
  maybeExpandCanvasByTarget(target, { left: nextLeft, top: nextTop });
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
       
       const relativeLeft = Math.round((nodeRect.left - containerRect.left) / store.zoom);
       const relativeTop = Math.round((nodeRect.top - containerRect.top) / store.zoom);
       
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
               const absLeft = Math.round((nodeRect.left - canvasRect.left) / store.zoom);
               const absTop = Math.round((nodeRect.top - canvasRect.top) / store.zoom);
               
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
    clearDistanceGuides();
    events.forEach((ev: any) => {
        let nextLeft = ev.left;
        let nextTop = ev.top;
        if (!store.canvasAutoExpand) {
            const clamped = clampTargetWithinParent(ev.target, nextLeft, nextTop);
            nextLeft = clamped.left;
            nextTop = clamped.top;
        }
        nextLeft = Math.round(nextLeft);
        nextTop = Math.round(nextTop);
        ev.target.style.left = `${nextLeft}px`;
        ev.target.style.top = `${nextTop}px`;
    });
};

const onDragGroupEnd = ({ events }: any) => {
    clearDistanceGuides();
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

onMounted(() => {
  updateWrapperRect();
  window.addEventListener('resize', updateWrapperRect);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWrapperRect);
});

</script>

<style scoped>
.canvas-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
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
  background-color: transparent;
  background-repeat: repeat;
  background-size: auto;
  opacity: 0.95;
  z-index: 10000;
  pointer-events: none;
}

.distance-guide-cap {
  background: var(--el-color-danger);
  opacity: 0.95;
  z-index: 10000;
  pointer-events: none;
}

.distance-guide-label {
  color: #fff;
  background: var(--el-color-danger);
  padding: calc(2px / var(--zoom)) calc(4px / var(--zoom));
  border-radius: calc(2px / var(--zoom));
  font-size: calc(11px / var(--zoom));
  line-height: 1;
  font-weight: 500;
  z-index: 10001;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.ruler-corner {
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.92);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  z-index: 12000;
  backdrop-filter: saturate(150%) blur(10px);
}

.ruler {
  position: absolute;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(150%) blur(10px);
  z-index: 12000;
  user-select: none;
}

.ruler-x {
  left: 20px;
  top: 0;
  right: 0;
  height: 20px;
  border-bottom: 1px solid var(--border-color);
}

.ruler-y {
  left: 0;
  top: 20px;
  bottom: 0;
  width: 20px;
  border-right: 1px solid var(--border-color);
}

.ruler-tick {
  position: absolute;
  top: 0;
  height: 100%;
  transform: translateX(-0.5px);
}

.ruler-tick-y {
  left: 0;
  width: 100%;
  transform: translateY(-0.5px);
}

.ruler-tick-line {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: 100%;
  background: rgba(17, 24, 39, 0.18);
}

.ruler-tick-y .ruler-tick-line {
  width: 100%;
  height: 1px;
}

.ruler-tick-label {
  position: absolute;
  left: 2px;
  top: 2px;
  font-size: 10px;
  color: rgba(17, 24, 39, 0.65);
  transform: scale(calc(1 / var(--zoom)));
  transform-origin: left top;
}

.ruler-tick-y .ruler-tick-label {
  left: 2px;
  top: 2px;
}

.canvas-guide {
  position: absolute;
  background: var(--primary-color);
  opacity: 0.9;
  z-index: 11000;
  cursor: pointer;
}

.canvas-guide-preview {
  position: absolute;
  background: var(--primary-color);
  opacity: 0.55;
  z-index: 11001;
  pointer-events: none;
}
</style>
