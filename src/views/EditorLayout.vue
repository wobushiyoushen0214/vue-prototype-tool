<template>
  <el-container class="editor-layout">
    <el-header class="header">
      <div class="header-left">
        <div class="logo" @click="handleGoBack" style="cursor: pointer;">
          <el-icon style="margin-right: 4px;"><ArrowLeft /></el-icon>
          vue-prototype-tool
        </div>
        <el-divider direction="vertical" />
        <div class="project-name">{{ store.currentProjectName || '未命名项目' }}</div>
      </div>
      
      <div class="header-right">
        <div class="header-actions">
          <!-- 对齐工具合并到此处 -->
          <div class="align-tools" v-if="store.mode === 'edit'">
            <el-tooltip content="左对齐" :hide-after="0"><el-button text @click="handleAlign('left', $event)"><el-icon><d-arrow-left /></el-icon></el-button></el-tooltip>
            <el-tooltip content="水平居中" :hide-after="0"><el-button text @click="handleAlign('center', $event)"><el-icon><expand /></el-icon></el-button></el-tooltip>
            <el-tooltip content="右对齐" :hide-after="0"><el-button text @click="handleAlign('right', $event)"><el-icon><d-arrow-right /></el-icon></el-button></el-tooltip>
            <el-divider direction="vertical" />
            <el-tooltip content="顶对齐" :hide-after="0"><el-button text @click="handleAlign('top', $event)"><el-icon><top /></el-icon></el-button></el-tooltip>
            <el-tooltip content="垂直居中" :hide-after="0"><el-button text @click="handleAlign('middle', $event)"><el-icon><rank /></el-icon></el-button></el-tooltip>
            <el-tooltip content="底对齐" :hide-after="0"><el-button text @click="handleAlign('bottom', $event)"><el-icon><bottom /></el-icon></el-button></el-tooltip>
            <el-divider direction="vertical" />
          </div>

          <div class="mode-switch-container">
            <div 
              class="mode-switch-slider" 
              :style="{ transform: `translateX(${store.mode === 'edit' ? '2px' : 'calc(100% - 2px)'})` }"
            ></div>
            <button 
              class="mode-switch-btn" 
              :class="{ active: store.mode === 'edit' }"
              @click="store.setMode('edit')"
            >
              <el-icon><edit /></el-icon>
              <span>编辑</span>
            </button>
            <button 
              class="mode-switch-btn" 
              :class="{ active: store.mode === 'preview' }"
              @click="store.setMode('preview')"
            >
              <el-icon><monitor /></el-icon>
              <span>预览</span>
            </button>
          </div>
          
          <el-divider direction="vertical" />

          <template v-if="store.mode === 'preview' && store.annotations.length > 0">
            <el-button 
              type="danger" 
              plain 
              size="small" 
              @click="handleClearAnnotations"
              style="position: relative; z-index: 100;"
            >
              清空标注
            </el-button>
            <el-divider direction="vertical" />
          </template>
          
          <div class="zoom-controls">
            <el-button text @click="handleZoomOut"><el-icon><minus /></el-icon></el-button>
            <span class="zoom-text">{{ Math.round(store.zoom * 100) }}%</span>
            <el-button text @click="handleZoomIn"><el-icon><plus /></el-icon></el-button>
            <el-button text @click="handleResetZoom" size="small" class="reset-btn">1:1</el-button>
          </div>
          <el-divider direction="vertical" />
          <el-tooltip content="撤销 (Ctrl+Z)" :hide-after="0"><el-button @click="handleUndo($event)" text><el-icon><refresh-left /></el-icon></el-button></el-tooltip>
          <el-tooltip content="重做 (Ctrl+Shift+Z)" :hide-after="0"><el-button @click="handleRedo($event)" text><el-icon><refresh-right /></el-icon></el-button></el-tooltip>
          <el-select
            v-if="store.mode === 'edit'"
            v-model="selectedCanvasPreset"
            size="small"
            style="width: 160px; flex-shrink: 0;"
            @change="handleCanvasPresetChange"
          >
            <el-option
              v-for="p in canvasPresets"
              :key="p.key"
              :label="p.label"
              :value="p.key"
            />
            <el-option key="custom" label="自定义" value="custom" />
          </el-select>
          <el-button type="success" plain size="small" @click="showCodePreview = true">生成代码</el-button>
          <el-button type="primary" plain size="small" @click="openImportJsonDialog">导入 JSON</el-button>
          <el-button type="primary" plain size="small" @click="openExportJsonDialog">导出 JSON</el-button>
        </div>
      </div>
    </el-header>

    <!-- 代码预览弹窗 -->
    <el-dialog
      v-model="showCodePreview"
      title="Vue 3 代码预览"
      width="60%"
      destroy-on-close
      class="code-dialog"
    >
      <div class="code-container">
        <pre class="code-content"><code>{{ generatedCode }}</code></pre>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCodePreview = false">关闭</el-button>
          <el-button @click="handleDownloadVueCode">下载 .vue</el-button>
          <el-button type="primary" @click="handleCopyCode">
            复制代码
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showDesignJsonDialog"
      :title="designJsonMode === 'export' ? '导出设计 JSON' : '导入设计 JSON'"
      width="60%"
      destroy-on-close
    >
      <el-input
        v-model="designJsonDraft"
        type="textarea"
        :rows="18"
        :readonly="designJsonMode === 'export'"
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDesignJsonDialog = false">关闭</el-button>
          <template v-if="designJsonMode === 'export'">
            <el-button @click="handleCopyDesignJson">复制 JSON</el-button>
            <el-button type="primary" @click="handleDownloadDesignJson">下载 .json</el-button>
          </template>
          <template v-else>
            <el-button type="primary" @click="handleImportDesignJson">导入</el-button>
          </template>
        </span>
      </template>
    </el-dialog>
    <el-container class="editor-body">
      <el-aside v-if="store.mode === 'edit'" :width="`${leftPanelWidth}px`" class="sidebar">
        <Sidebar />
      </el-aside>
      <div v-if="store.mode === 'edit'" class="panel-resizer" @mousedown="startResize('left', $event)"></div>
      <el-main class="content">
        <EditorCanvas />
      </el-main>
      <div v-if="store.mode === 'edit'" class="panel-resizer" @mousedown="startResize('right', $event)"></div>
      <el-aside v-if="store.mode === 'edit'" :width="`${rightPanelWidth}px`" class="right-panel">
        <PropertyPanel />
      </el-aside>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Sidebar from '@/components/Editor/Sidebar.vue';
import EditorCanvas from '@/components/Editor/EditorCanvas.vue';
import PropertyPanel from '@/components/Editor/PropertyPanel.vue';
import { useEditorStore } from '@/store/editor';
import { ElMessage, ElMessageBox } from 'element-plus';
import { generateVueCode } from '@/utils/code-generator';
import { throttle } from 'lodash-es';
import {
  DArrowLeft,
  Expand,
  DArrowRight,
  Top,
  Rank,
  Bottom,
  RefreshLeft,
  RefreshRight,
  Plus,
  Minus,
  Monitor,
  Edit,
  ArrowLeft
} from '@element-plus/icons-vue';
import { toJpeg } from 'html-to-image';

const store = useEditorStore();
const router = useRouter();
const route = useRoute();

onMounted(() => {
  const id = route.params.id as string;
  if (id) {
    store.openProject(id);
  } else {
    router.push('/');
  }
});

const handleGoBack = async () => {
  // 生成缩略图
  try {
    const canvasEl = document.querySelector('.editor-canvas') as HTMLElement;
    if (canvasEl) {
      const thumbnail = await toJpeg(canvasEl, {
        quality: 0.8,
        width: store.config.width,
        height: store.config.height,
        style: {
          transform: 'none',
        }
      });
      store.updateProjectThumbnail(store.currentProjectId, thumbnail);
    }
  } catch (e) {
    console.error('Failed to generate thumbnail', e);
  }
  
  store.goBackToList();
  router.push('/');
};

const leftPanelWidth = ref(312);
const rightPanelWidth = ref(320);
const resizingSide = ref<'left' | 'right' | null>(null);
let resizingStartX = 0;
let resizingStartWidth = 0;

const showCodePreview = ref(false);
const generatedCode = computed(() => {
  return generateVueCode(store.nodes, store.config);
});

const showDesignJsonDialog = ref(false);
const designJsonMode = ref<'export' | 'import'>('export');
const designJsonDraft = ref('');

const getDraftKey = (projectId: string) => `vue-prototype-tool:draft:v1:${projectId}`;
const canvasPresets = [
  { key: 'mobile-750-1334', label: 'Mobile 750×1334 (2x)', width: 750, height: 1334 },
  { key: 'web-1920-1080', label: 'Web 1920×1080', width: 1920, height: 1080 },
  { key: 'web-1440-900', label: 'Web 1440×900', width: 1440, height: 900 },
  { key: 'mobile-390-844', label: 'Mobile 390×844', width: 390, height: 844 },
  { key: 'mobile-375-667', label: 'Mobile 375×667', width: 375, height: 667 },
] as const;

const findPresetKey = (w: number, h: number) => {
  const hit = canvasPresets.find(p => p.width === w && p.height === h);
  return hit?.key ?? 'custom';
};

const selectedCanvasPreset = ref<string>(findPresetKey(store.config.width, store.config.height));

watch(() => [store.config.width, store.config.height], () => {
  selectedCanvasPreset.value = findPresetKey(store.config.width, store.config.height);
});

const handleCanvasPresetChange = (key: string) => {
  const preset = canvasPresets.find(p => p.key === key);
  if (!preset) return;
  store.updateConfig({ width: preset.width, height: preset.height });
  store.saveHistory();
};

const handleNewScene = () => {
  ElMessageBox.confirm('确定要新建一个场景吗？当前场景的数据会被保留。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  }).then(() => {
    store.addScene('');
    ElMessage.success('已新建场景');
  }).catch(() => {});
};

const handleCopyCode = async () => {
  try {
    await navigator.clipboard.writeText(generatedCode.value);
    ElMessage.success('代码已复制到剪贴板');
  } catch (err) {
    ElMessage.error('复制失败');
  }
};

const handleDownloadVueCode = () => {
  const blob = new Blob([generatedCode.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `page-${Date.now()}.vue`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  ElMessage.success('已下载');
};

const openExportJsonDialog = () => {
  designJsonMode.value = 'export';
  designJsonDraft.value = store.exportDesign();
  showDesignJsonDialog.value = true;
};

const openImportJsonDialog = () => {
  designJsonMode.value = 'import';
  designJsonDraft.value = '';
  showDesignJsonDialog.value = true;
};

const handleCopyDesignJson = async () => {
  try {
    await navigator.clipboard.writeText(designJsonDraft.value);
    ElMessage.success('JSON 已复制到剪贴板');
  } catch (err) {
    ElMessage.error('复制失败');
  }
};

const handleDownloadDesignJson = () => {
  const blob = new Blob([designJsonDraft.value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `design-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  ElMessage.success('已下载');
};

const handleImportDesignJson = () => {
  const ok = store.importDesign(designJsonDraft.value);
  if (!ok) {
    ElMessage.error('JSON 格式不正确或缺少 nodes');
    return;
  }
  showDesignJsonDialog.value = false;
  ElMessage.success('导入成功');
};

const saveDraftThrottled = throttle(() => {
  try {
    const pid = store.currentProjectId;
    if (!pid) return;
    localStorage.setItem(getDraftKey(pid), store.exportDesign());
  } catch {
  }
}, 800, { leading: false, trailing: true });

watch(() => [store.nodes, store.config, store.currentSceneId], () => {
  saveDraftThrottled();
}, { deep: true });

// 键盘快捷键支持
const handleKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
  }

  const key = String(e.key || '').toLowerCase();

  // 撤销 Ctrl+Z
  if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
    e.preventDefault();
    store.undo();
  }
  // 重做 Ctrl+Shift+Z 或 Ctrl+Y
  if (((e.ctrlKey || e.metaKey) && key === 'z' && e.shiftKey) || ((e.ctrlKey || e.metaKey) && key === 'y')) {
    e.preventDefault();
    store.redo();
  }
  if (key === 'escape') {
    e.preventDefault();
    store.clearSelection();
  }

  if (store.mode !== 'edit') return;

  if ((e.ctrlKey || e.metaKey) && key === 'a') {
    e.preventDefault();
    store.selectAllNodes();
  }
  if ((e.ctrlKey || e.metaKey) && key === 'd') {
    e.preventDefault();
    store.duplicateSelectedNodes();
  }
  if ((e.ctrlKey || e.metaKey) && key === 'l') {
    e.preventDefault();
    store.toggleSelectedLocked();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'h') {
    e.preventDefault();
    store.toggleSelectedHidden();
  }
  // 复制 Ctrl+C
  if ((e.ctrlKey || e.metaKey) && key === 'c') {
    e.preventDefault();
    store.copyNodes();
  }
  // 粘贴 Ctrl+V
  if ((e.ctrlKey || e.metaKey) && key === 'v') {
    e.preventDefault();
    store.pasteNodes();
  }
  // 删除 Delete 或 Backspace
  if (e.key === 'Delete' || (e.key === 'Backspace' && !e.metaKey)) {
    if (store.selectedNodeIds.length > 0) {
      e.preventDefault();
      store.deleteSelectedNodes();
    }
  }
  // 微调方向键
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    if (store.selectedNodeIds.length > 0) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowUp') dy = -step;
      if (e.key === 'ArrowDown') dy = step;
      if (e.key === 'ArrowLeft') dx = -step;
      if (e.key === 'ArrowRight') dx = step;
      store.nudgeSelectedNodes(dx, dy);
    }
  }
};

onMounted(() => {
  try {
    if (store.nodes.length === 0) {
      const pid = store.currentProjectId;
      if (pid) {
        const draft = localStorage.getItem(getDraftKey(pid));
        if (draft) {
          const ok = store.importDesign(draft);
          if (ok) ElMessage.success('已从本地草稿恢复');
        }
      }
    }
  } catch {
  }
  store.initHistory();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const startResize = (side: 'left' | 'right', e: MouseEvent) => {
  resizingSide.value = side;
  resizingStartX = e.clientX;
  resizingStartWidth = side === 'left' ? leftPanelWidth.value : rightPanelWidth.value;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', stopResize);
};

const onResizeMove = (e: MouseEvent) => {
  if (!resizingSide.value) return;
  const delta = e.clientX - resizingStartX;
  const minWidth = 240;
  const maxWidth = 520;

  if (resizingSide.value === 'left') {
    leftPanelWidth.value = Math.max(minWidth, Math.min(maxWidth, resizingStartWidth + delta));
  } else {
    rightPanelWidth.value = Math.max(minWidth, Math.min(maxWidth, resizingStartWidth - delta));
  }
};

const stopResize = () => {
  resizingSide.value = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  window.removeEventListener('mousemove', onResizeMove);
  window.removeEventListener('mouseup', stopResize);
};

const handleUndo = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement)?.blur();
  store.undo();
};
const handleRedo = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement)?.blur();
  store.redo();
};
const handleClearAnnotations = () => {
  store.clearAnnotations();
};

const handleAlign = (type: any, e: MouseEvent) => {
  (e.currentTarget as HTMLElement)?.blur();
  store.alignSelectedNodes(type);
};

const handleZoomIn = () => store.setZoom(store.zoom + 0.1);
const handleZoomOut = () => store.setZoom(store.zoom - 0.1);
const handleResetZoom = () => {
  store.setZoom(1);
  store.setOffset({ x: 0, y: 0 });
};
</script>

<style scoped>
.editor-layout {
  height: 100vh;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(150%) blur(10px);
  border-bottom: 1px solid var(--border-color);
  padding: 0 16px;
  height: 52px;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}
.header-left {
  display: flex;
  align-items: center;
  flex: 0 0 auto; /* Logo 区域不再占据剩余空间 */
  min-width: 0;
  justify-content: flex-start;
  margin-right: 24px;
}
.header-right {
  display: flex;
  align-items: center;
  flex: 1; /* 占据所有剩余空间 */
  min-width: 0;
  justify-content: flex-end;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  padding: 0 4px;
  max-width: 100%;
}
.align-tools {
  display: flex;
  align-items: center;
  background: var(--panel-bg-muted);
  border: 1px solid var(--border-color-light);
  border-radius: 999px;
  padding: 2px 4px;
  flex-shrink: 0;
}
.header-actions::-webkit-scrollbar {
  height: 4px;
}
.header-actions::-webkit-scrollbar-thumb {
  background: rgba(17, 24, 39, 0.18);
  border-radius: 999px;
}
.header-actions :deep(.el-button),
.header-actions :deep(.el-select),
.header-actions .mode-switch-container,
.header-actions .align-tools {
  flex-shrink: 0;
}
.logo {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.2px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo::before {
  content: '';
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, var(--primary-color), #60a5fa);
  border-radius: 5px;
}
.project-pill {
  margin-left: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--panel-bg-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.editor-body {
  overflow: hidden;
}
.content {
  background: var(--bg-color);
  padding: 0;
  overflow: hidden;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}
.sidebar, .right-panel {
  background: var(--panel-bg);
  border: none;
  z-index: 50;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.sidebar {
  border-right: 1px solid var(--border-color);
}
.right-panel {
  border-left: 1px solid var(--border-color);
}
.panel-resizer {
  width: 6px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  z-index: 60;
}
.panel-resizer::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 2px;
  width: 2px;
  background: transparent;
  border-radius: 999px;
  transition: background 0.15s ease;
}
.panel-resizer:hover::before {
  background: rgba(17, 24, 39, 0.18);
}
.zoom-controls {
  display: flex;
  align-items: center;
  background: var(--panel-bg-muted);
  border: 1px solid var(--border-color-light);
  border-radius: 999px;
  padding: 2px 4px;
}

/* 代码预览弹窗样式 */
.code-container {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.code-content {
  margin: 0;
  color: #e2e8f0;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.code-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
}

.zoom-text {
  font-size: 12px;
  font-weight: 700;
  width: 48px;
  text-align: center;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.reset-btn {
  margin-left: 4px;
  font-weight: 600 !important;
  font-size: 11px !important;
  color: var(--text-secondary) !important;
}

/* 模式切换器优化 */
.mode-switch-container {
  display: flex;
  align-items: center;
  background: #f1f5f9; /* 强制使用一个可见的浅灰色背景 */
  border-radius: 999px;
  border: 1px solid var(--border-color-light);
  position: relative;
  width: 136px;
  min-width: 136px;
  height: 32px;
  flex-shrink: 0;
}

.mode-switch-slider {
  position: absolute;
  top: 2px;
  left: 0;
  width: 68px;
  height: 28px;
  background: #fff;
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.mode-switch-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  z-index: 2;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  opacity: 0.7;
  transition: all 0.3s ease;
  padding: 0;
  height: 100%;
}

.mode-switch-btn.active {
  opacity: 1;
  color: var(--text-primary);
}

.mode-switch-btn i {
  font-size: 14px;
}

/* 深色按钮样式优化 */
:deep(.el-button.is-text) {
  color: var(--text-secondary);
  padding: 6px;
  height: 28px;
}

:deep(.el-button.is-text:hover) {
  background-color: var(--primary-light);
  color: var(--primary-color);
}
</style>
