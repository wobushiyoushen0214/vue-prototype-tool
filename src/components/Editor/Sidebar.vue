<template>
  <div class="sidebar-container">
    <!-- 拖拽镜像模板 -->
    <div ref="dragGhostRef" class="drag-ghost-container">
      <EditorComponent 
        v-if="ghostComp"
        :type="ghostComp.type"
        :props="ghostComp.defaultProps"
        :style="ghostComp.defaultStyle"
        :is-preview="true"
      />
    </div>

    <div class="sidebar-top">
      <!-- 画布管理 -->
      <div class="scenes-manager">
        <div class="scenes-header">
          <span class="scenes-title">画布</span>
          <el-button text size="small" @click="handleAddScene">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        <div class="scenes-list">
          <div 
            v-for="scene in store.scenes" 
            :key="scene.id"
            class="scene-item"
            :class="{ active: store.currentSceneId === scene.id }"
            @click="store.switchScene(scene.id)"
          >
            <el-input
              v-if="editingSceneId === scene.id"
              v-model="editingSceneName"
              size="small"
              class="scene-rename-input"
              @blur="finishRenameScene(scene.id)"
              @keyup.enter="finishRenameScene(scene.id)"
              v-focus
            />
            <span v-else class="scene-name" @dblclick="startRenameScene(scene)">{{ scene.name }}</span>
            <div class="scene-actions">
              <el-button 
                text 
                size="small" 
                class="scene-action-btn"
                @click.stop="store.toggleSceneLock(scene.id)"
              >
                <el-icon :class="{ 'is-locked': scene.config.lockSize }">
                  <Lock v-if="scene.config.lockSize" />
                  <Unlock v-else />
                </el-icon>
              </el-button>
              <el-dropdown trigger="click" @command="(cmd: string) => handleSceneCommand(cmd, scene)">
                <el-icon class="scene-more"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="duplicate">复制</el-dropdown-item>
                    <el-dropdown-item command="delete" divided :disabled="store.scenes.length <= 1">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>

      <div class="custom-tab-bar">
        <div 
          v-for="tab in [{label: '组件', value: 'components'}, {label: '图层', value: 'layers'}, {label: '素材', value: 'assets'}]"
          :key="tab.value"
          class="custom-tab-item"
          :class="{ active: mainTab === tab.value }"
          @click="mainTab = tab.value"
        >
          {{ tab.label }}
        </div>
      </div>
      <el-input
        v-model="searchText"
        size="small"
        clearable
        placeholder="搜索组件 / 图层 / 素材"
        class="sidebar-search"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <div class="sidebar-content">
      <div v-show="mainTab === 'components'" class="tab-content">
        <div class="tab-scroll">
          <div class="library-tab-bar">
            <div
              v-for="tab in componentLibraryTabs"
              :key="tab.value"
              class="library-tab-item"
              :class="{ active: componentLibrary === tab.value }"
              @click="componentLibrary = tab.value"
            >
              {{ tab.label }}
            </div>
          </div>
          <div v-if="componentLibrary === 'team'" class="team-actions">
            <input
              ref="importFolderInputRef"
              type="file"
              webkitdirectory
              directory
              multiple
              style="display: none"
              @change="handleImportFolderChange"
            />
            <el-button style="width: 100%" type="primary" plain size="small" @click="openImportFolder">
              <el-icon style="margin-right: 6px"><Upload /></el-icon>
              导入组件文件夹
            </el-button>
          </div>
          <div
            v-for="section in componentSections"
            :key="section.key"
            class="component-section"
          >
            <div v-if="section.items.length > 0" class="section-header">
              <span class="section-title">{{ section.title }}</span>
              <span class="section-count">{{ section.items.length }}</span>
            </div>
            <div v-if="section.items.length > 0" class="component-grid">
              <el-popover
                v-for="comp in section.items"
                :key="comp.type + '-' + comp.label"
                placement="right"
                trigger="hover"
                :width="'auto'"
                popper-class="component-preview-popper"
                :disabled="isDragging"
              >
                <template #default>
                  <div class="component-preview-popup">
                    <el-icon v-if="comp.type === 'el-icon'" :size="20" :color="primaryColor"><EditPen /></el-icon>
                    <EditorComponent
                      v-else
                      :type="comp.type"
                      :props="comp.defaultProps"
                      :style="comp.defaultStyle"
                      :is-preview="true"
                    />
                  </div>
                </template>
                <template #reference>
                  <div
                    class="component-item"
                    draggable="true"
                    @mousedown="prepareDrag(comp)"
                    @dragstart="handleDragStart(comp, $event)"
                    @dragend="handleDragEnd"
                  >
                    <div class="component-icon">
                      <el-icon><component :is="getIcon(comp.type)" /></el-icon>
                    </div>
                    <span class="comp-label">{{ comp.label }}</span>
                  </div>
                </template>
              </el-popover>
            </div>
          </div>
        </div>
      </div>
      
      <div v-show="mainTab === 'layers'" class="tab-content">
        <div class="tab-scroll">
          <div class="layers-panel">
            <el-empty v-if="filteredLayers.length === 0" description="暂无图层" />
            <div v-else class="layer-list">
              <div
                v-for="row in filteredLayers"
                :key="row.node.id"
                class="layer-item"
                :class="{ selected: store.selectedNodeIds.includes(row.node.id) }"
                draggable="true"
                @dragstart="onLayerDragStart(row.node.id, $event)"
                @dragend="onLayerDragEnd"
                @dragover.prevent
                @drop.prevent="onLayerDrop(row.node.id)"
                @click="handleSelectLayer(row.node.id, $event)"
              >
                <span class="layer-icon" :style="{ paddingLeft: `${row.depth * 14}px` }">
                  <el-icon><component :is="getIcon(row.node.type)" /></el-icon>
                </span>
                <div class="layer-name" @dblclick.stop="beginRename(row.node.id)">
                  <el-input
                    v-if="renamingId === row.node.id"
                    :id="`layer-rename-${row.node.id}`"
                    v-model="renameDraft"
                    size="small"
                    @blur="commitRename"
                    @keydown.enter.prevent="commitRename"
                    @keydown.esc.prevent="cancelRename"
                  />
                  <span v-else class="layer-name-text">{{ row.node.label || row.node.type }}</span>
                </div>
                <div class="layer-actions">
                  <button class="layer-action-btn" @click.stop="toggleLocked(row.node.id)">
                    <el-icon v-if="row.node.locked"><Lock /></el-icon>
                    <el-icon v-else><Unlock /></el-icon>
                  </button>
                  <button class="layer-action-btn" @click.stop="toggleHidden(row.node.id)">
                    <el-icon v-if="!row.node.hidden"><View /></el-icon>
                    <el-icon v-else><Hide /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="mainTab === 'assets'" class="tab-content">
        <div class="tab-scroll">
          <div class="assets-panel">
            <el-upload
              action=""
              :show-file-list="false"
              :before-upload="handleUpload"
              accept="image/*"
            >
              <el-button style="width: 100%" type="primary" plain size="small">
                <el-icon style="margin-right: 6px"><Upload /></el-icon>
                上传图片
              </el-button>
            </el-upload>

            <div v-if="filteredAssets.length === 0" class="assets-empty">
              <el-empty description="暂无素材" />
            </div>

            <div v-else class="assets-grid">
              <div
                v-for="asset in filteredAssets"
                :key="asset.label"
                class="asset-item"
                draggable="true"
                @mousedown="prepareDrag(asset)"
                @dragstart="handleDragStart(asset, $event)"
                @dragend="handleDragEnd"
              >
                <img class="asset-thumb" :src="asset.defaultProps.src" draggable="false" />
                <div class="asset-name" :title="asset.label">{{ asset.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <el-dialog
    v-model="showImportComponentDialog"
    title="组件导入"
    width="60%"
    destroy-on-close
  >
    <div class="import-dialog-body">
      <div class="import-summary">
        已解析 {{ importedConfigs.length }} 个组件配置
      </div>
      <el-input v-model="importedConfigText" type="textarea" :rows="16" readonly />
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showImportComponentDialog = false">关闭</el-button>
        <el-button @click="handleCopyImportedConfig">复制</el-button>
        <el-button type="primary" @click="handleAddImportedComponents">添加到团队组件</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useEditorStore } from '@/store/editor';
import type { ComponentSchema } from '@/types/editor';
import EditorComponent from '@/components/Editor/EditorComponent.vue';
import { elementPlusComponents } from '@/config/component-list';
import { ElMessage } from 'element-plus';
import { 
  EditPen, 
  Files, 
  Menu, 
  Picture,
  Upload,
  View,
  Hide,
  Postcard,
  Search,
  Lock,
  Unlock,
  Plus,
  MoreFilled
} from '@element-plus/icons-vue';

const store = useEditorStore();
const mainTab = ref('components');

// 画布管理状态
const editingSceneId = ref<string | null>(null);
const editingSceneName = ref('');

const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus()
};

const handleAddScene = () => {
  store.addScene(`画布 ${store.scenes.length + 1}`);
};

const startRenameScene = (scene: any) => {
  editingSceneId.value = scene.id;
  editingSceneName.value = scene.name;
};

const finishRenameScene = (id: string) => {
  if (editingSceneName.value.trim()) {
    store.renameScene(id, editingSceneName.value.trim());
  }
  editingSceneId.value = null;
};

const handleSceneCommand = (cmd: string, scene: any) => {
  if (cmd === 'rename') {
    startRenameScene(scene);
  } else if (cmd === 'delete') {
    store.deleteScene(scene.id);
  } else if (cmd === 'duplicate') {
    store.copyScene(scene.id);
  }
};
const componentLibrary = ref<'all' | 'builtin' | 'element-plus' | 'team'>('all');
const componentLibraryTabs = [
  { label: '全部', value: 'all' },
  { label: '基础', value: 'builtin' },
  { label: 'Element', value: 'element-plus' },
  { label: '团队组件', value: 'team' },
] as const;
const isDragging = ref(false);
const dragGhostRef = ref<HTMLElement | null>(null);
const ghostComp = ref<ComponentSchema | null>(null);
const searchText = ref('');
const primaryColor = computed(() => getComputedStyle(document.documentElement).getPropertyValue('--primary-color')?.trim() || '#2563eb');
const renamingId = ref<string | null>(null);
const renameDraft = ref('');
const draggedLayerId = ref<string | null>(null);
const importFolderInputRef = ref<HTMLInputElement | null>(null);
const showImportComponentDialog = ref(false);
const importedConfigs = ref<ComponentSchema[]>([]);
const importedConfigText = ref('');
const IMPORTED_COMPONENTS_KEY = 'imported_custom_components';

const basicComponents: ComponentSchema[] = [
  {
    type: 'text',
    label: '文本',
    category: 'basic',
    defaultProps: { text: '文本内容' },
    defaultStyle: {
      width: 'fit-content',
      height: 'auto',
      color: '#000000',
      fontSize: '14px',
      lineHeight: '1.4',
      whiteSpace: 'nowrap'
    }
  },
  {
    type: 'button',
    label: '按钮',
    category: 'basic',
    defaultProps: { text: '按钮', type: 'primary' },
    defaultStyle: {
      width: '80px',
      height: '32px',
    }
  },
  {
    type: 'container',
    label: '容器',
    category: 'layout',
    defaultProps: {},
    defaultStyle: {
      width: '60px',
      height: '60px',
      backgroundColor: '#f0f0f0',
      border: '1px solid #cccccc'
    }
  },
  {
     type: 'image',
     label: '图片',
     category: 'basic',
     defaultProps: { src: 'https://via.placeholder.com/150' },
     defaultStyle: {
       width: '60px',
       height: '60px'
     }
  }
];

const customComponents = ref<ComponentSchema[]>([]);

onMounted(() => {
  // 加载自动注册的自定义组件配置
  const configs = import.meta.glob('@/custom-components/**/config.ts', { eager: true });
  for (const path in configs) {
    const config = (configs[path] as any).default;
    if (config) {
      customComponents.value.push(config);
    }
  }

  try {
    const raw = localStorage.getItem(IMPORTED_COMPONENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((c: any) => {
          if (c && typeof c.type === 'string') {
            customComponents.value.push(c);
          }
        });
      }
    }
  } catch {
  }
});

const getIcon = (type: string) => {
  // 简单的图标映射逻辑
  if (type.startsWith('el-')) return Menu;
  switch (type) {
    case 'text': return EditPen;
    case 'button': return Files;
    case 'container': return Menu;
    case 'image': return Picture;
    case 'TeamCard': return Postcard;
    default: return Menu;
  }
};

const prepareDrag = (comp: ComponentSchema) => {
  ghostComp.value = comp;
};

const openImportFolder = () => {
  const el = importFolderInputRef.value;
  if (!el) return;
  el.value = '';
  el.click();
};

const parseLiteral = (raw: string) => {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  const n = Number(s);
  if (!Number.isNaN(n) && s !== '') return n;
  return '';
};

const inferPropsFromVue = (sfcText: string) => {
  const propsMeta: Record<string, any> = {};
  const defaultProps: Record<string, any> = {};

  // 1. 匹配 defineProps<{ ... }>() TS 接口写法
  const tsMatch = sfcText.match(/defineProps\s*<\s*\{([\s\S]*?)\}\s*>/);
  if (tsMatch) {
    const body = tsMatch[1] ?? '';
    const re = /(\w+)\s*(\?)?\s*:\s*(string|number|boolean)/g;
    let mm;
    while ((mm = re.exec(body))) {
      const key = mm[1];
      const type = mm[3];
      if (!key) continue;
      propsMeta[key] = { label: key, type: type === 'number' ? 'number' : (type === 'boolean' ? 'boolean' : 'string') };
      defaultProps[key] = type === 'number' ? 0 : (type === 'boolean' ? false : '');
    }
    
    // 尝试匹配 withDefaults 的默认值
    const withDefaultsMatch = sfcText.match(/withDefaults\s*\(\s*defineProps[\s\S]*?,\s*\{([\s\S]*?)\}\s*\)/);
    if (withDefaultsMatch) {
      const defaultsBody = withDefaultsMatch[1] ?? '';
      const defRe = /(\w+)\s*:\s*([^,\n}]+)/g;
      let dmm;
      while ((dmm = defRe.exec(defaultsBody))) {
        const key = dmm[1];
        const val = dmm[2]?.trim();
        if (key && val && defaultProps[key] !== undefined) {
          defaultProps[key] = parseLiteral(val);
        }
      }
    }
    return { propsMeta, defaultProps };
  }

  // 2. 匹配 defineProps({ ... }) 对象写法
  const objMatch = sfcText.match(/defineProps\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (objMatch) {
    const body = objMatch[1] ?? '';
    const re = /(\w+)\s*:\s*\{[\s\S]*?type\s*:\s*(String|Number|Boolean)[\s\S]*?(?:default\s*:\s*([^,\n}]+))?[\s\S]*?\}/g;
    let mm;
    while ((mm = re.exec(body))) {
      const key = mm[1];
      const t = mm[2];
      const d = mm[3] ?? '';
      if (!key) continue;
      const metaType = t === 'Number' ? 'number' : (t === 'Boolean' ? 'boolean' : 'string');
      propsMeta[key] = { label: key, type: metaType };
      if (d) {
        defaultProps[key] = parseLiteral(d);
      } else {
        defaultProps[key] = metaType === 'number' ? 0 : (metaType === 'boolean' ? false : '');
      }
    }
    return { propsMeta, defaultProps };
  }

  return { propsMeta, defaultProps };
};

const normalizeImportedSchema = (raw: any, fallbackType: string): ComponentSchema => {
  const type = typeof raw?.type === 'string' && raw.type.trim() ? raw.type.trim() : fallbackType;
  const label = typeof raw?.label === 'string' && raw.label.trim() ? raw.label.trim() : type;
  const category = typeof raw?.category === 'string' && raw.category.trim() ? raw.category.trim() : 'custom';
  const defaultProps = raw?.defaultProps && typeof raw.defaultProps === 'object' ? raw.defaultProps : {};
  const defaultStyle = raw?.defaultStyle && typeof raw.defaultStyle === 'object'
    ? raw.defaultStyle
    : { width: '240px', height: 'auto' };
  const propsMeta = raw?.propsMeta && typeof raw.propsMeta === 'object' ? raw.propsMeta : undefined;
  const icon = typeof raw?.icon === 'string' ? raw.icon : undefined;
  return { type, label, category, defaultProps, defaultStyle, ...(propsMeta ? { propsMeta } : {}), ...(icon ? { icon } : {}) } as ComponentSchema;
};

const schemaToTs = (schema: ComponentSchema) => {
  const payload: any = {
    type: schema.type,
    label: schema.label,
    icon: schema.icon,
    category: schema.category,
    defaultProps: schema.defaultProps ?? {},
    propsMeta: (schema as any).propsMeta,
    defaultStyle: schema.defaultStyle ?? {},
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
  return `import type { ComponentSchema } from '@/types/editor';\n\nexport default ${JSON.stringify(payload, null, 2)} as Partial<ComponentSchema>;`;
};

const handleImportFolderChange = (e: Event) => {
  const input = e.target as HTMLInputElement | null;
  const files = Array.from(input?.files ?? []);
  if (files.length === 0) return;

  const byRoot = new Map<string, File[]>();
  files.forEach(f => {
    const rel = (f as any).webkitRelativePath as string | undefined;
    const root = (rel ? rel.split('/')[0] : '') || 'ImportedComponent';
    byRoot.set(root, [...(byRoot.get(root) ?? []), f]);
  });

  Promise.resolve().then(async () => {
    const next: ComponentSchema[] = [];
    for (const [root, list] of byRoot.entries()) {
      const configJson = list.find(f => ((f as any).webkitRelativePath as string | undefined)?.toLowerCase().endsWith('/config.json'));
      const indexVue = list.find(f => ((f as any).webkitRelativePath as string | undefined)?.toLowerCase().endsWith('/index.vue'));

      if (configJson) {
        try {
          const text = await configJson.text();
          const parsed = JSON.parse(text);
          next.push(normalizeImportedSchema(parsed, root));
          continue;
        } catch {
        }
      }

      if (indexVue) {
        try {
          const sfc = await indexVue.text();
          const { propsMeta, defaultProps } = inferPropsFromVue(sfc);
          next.push(normalizeImportedSchema({ type: root, label: root, category: 'custom', defaultProps, propsMeta }, root));
          continue;
        } catch {
        }
      }

      next.push(normalizeImportedSchema({ type: root, label: root, category: 'custom' }, root));
    }

    importedConfigs.value = next;
    importedConfigText.value = next.map(schemaToTs).join('\n\n');
    showImportComponentDialog.value = true;
    ElMessage.success(`已解析 ${next.length} 个组件配置`);
  });
};

const handleCopyImportedConfig = () => {
  const text = importedConfigText.value || '';
  if (!text) return;
  Promise.resolve()
    .then(() => navigator.clipboard.writeText(text))
    .then(() => ElMessage.success('已复制'))
    .catch(() => ElMessage.error('复制失败'));
};

const handleAddImportedComponents = () => {
  if (importedConfigs.value.length === 0) return;
  const existing = new Set(customComponents.value.map(c => c.type));
  const toAdd = importedConfigs.value.filter(c => !existing.has(c.type));
  if (toAdd.length === 0) {
    ElMessage.info('没有可新增的组件（type 已存在）');
    return;
  }
  customComponents.value.push(...toAdd);
  try {
    const current = customComponents.value.filter(c => c.category === 'custom');
    localStorage.setItem(IMPORTED_COMPONENTS_KEY, JSON.stringify(current));
  } catch {
  }
  ElMessage.success(`已添加 ${toAdd.length} 个组件`);
  showImportComponentDialog.value = false;
};

const handleDragStart = (comp: ComponentSchema, e: DragEvent) => {
  isDragging.value = true;
  store.setDraggedComponent(comp);

  if (e.dataTransfer && dragGhostRef.value) {
    e.dataTransfer.effectAllowed = 'copy';
    // 使用预先准备好的影子元素作为拖拽镜像
    const ghost = dragGhostRef.value;
    // 设置拖拽镜像，偏移量设为 0 确保组件紧贴鼠标
    e.dataTransfer.setDragImage(ghost, 0, 0);
  }
};

const handleDragEnd = () => {
  isDragging.value = false;
  ghostComp.value = null;
  store.setDraggedComponent(null);
};

const handleUpload = (file: any) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target?.result as string;
    const newComp: ComponentSchema = {
      type: 'image',
      label: file.name,
      category: 'custom',
      defaultProps: { src },
      defaultStyle: {
        width: '100px',
        height: '100px'
      }
    };
    customComponents.value.push(newComp);
  };
  reader.readAsDataURL(file);
  return false; // Prevent upload
};

const handleSelectLayer = (id: string, e: MouseEvent) => {
  const multi = e.shiftKey || e.metaKey || e.ctrlKey;
  store.selectNode(id, multi);
};

const toggleHidden = (id: string) => {
  if (store.selectedNodeIds.includes(id)) {
    store.toggleSelectedHidden();
    return;
  }
  store.toggleNodeHidden(id);
};

const toggleLocked = (id: string) => {
  if (store.selectedNodeIds.includes(id)) {
    store.toggleSelectedLocked();
    return;
  }
  store.toggleNodeLocked(id);
};

const beginRename = async (id: string) => {
  const node = store.nodes.find(n => n.id === id);
  if (!node) return;
  renamingId.value = id;
  renameDraft.value = node.label || '';
  await nextTick();
  const el = document.getElementById(`layer-rename-${id}`);
  (el as HTMLInputElement | null)?.focus?.();
  (el as HTMLInputElement | null)?.select?.();
};

const commitRename = () => {
  if (!renamingId.value) return;
  const id = renamingId.value;
  const next = renameDraft.value.trim() || '未命名';
  store.updateNodeLabel(id, next);
  renamingId.value = null;
};

const cancelRename = () => {
  renamingId.value = null;
};

const onLayerDragStart = (id: string, e: DragEvent) => {
  draggedLayerId.value = id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
};

const onLayerDrop = (targetId: string) => {
  if (!draggedLayerId.value) return;
  const sourceId = draggedLayerId.value;
  draggedLayerId.value = null;
  store.moveNodeToTarget(sourceId, targetId);
};

const onLayerDragEnd = () => {
  draggedLayerId.value = null;
};

const matchesSearch = (text: string) => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
};

const filterComponentList = (list: ComponentSchema[]) => {
  if (!searchText.value.trim()) return list;
  return list.filter(comp => matchesSearch(`${comp.label} ${comp.type}`));
};

const customWidgets = computed(() => customComponents.value.filter(c => c.type !== 'image'));
const uploadedImages = computed(() => customComponents.value.filter(c => c.type === 'image'));

const componentSections = computed(() => {
  const all = [
    { key: 'builtin', title: '基础', items: filterComponentList(basicComponents) },
    { key: 'layout', title: '布局', items: filterComponentList(elementPlusComponents['layout'] ?? []) },
    { key: 'basic', title: '基础控件', items: filterComponentList(elementPlusComponents['basic'] ?? []) },
    { key: 'form', title: '表单', items: filterComponentList(elementPlusComponents['form'] ?? []) },
    { key: 'data', title: '数据展示', items: filterComponentList(elementPlusComponents['data'] ?? []) },
    { key: 'nav', title: '导航', items: filterComponentList(elementPlusComponents['navigation'] ?? []) },
    { key: 'feedback', title: '反馈', items: filterComponentList(elementPlusComponents['feedback'] ?? []) },
    { key: 'custom', title: '团队组件', items: filterComponentList(customWidgets.value) }
  ];
  if (componentLibrary.value === 'all') return all;
  if (componentLibrary.value === 'builtin') return all.filter(s => s.key === 'builtin');
  if (componentLibrary.value === 'team') return all.filter(s => s.key === 'custom');
  return all.filter(s => s.key !== 'builtin' && s.key !== 'custom');
});

const filteredAssets = computed(() => {
  const list = uploadedImages.value;
  return filterComponentList(list);
});

const flattenLayers = (nodes: any[], depth = 0) => {
  const rows: { node: any; depth: number }[] = [];
  nodes.forEach(n => {
    rows.push({ node: n, depth });
    if (Array.isArray(n.children) && n.children.length > 0) {
      rows.push(...flattenLayers(n.children, depth + 1));
    }
  });
  return rows;
};

const filteredLayers = computed(() => {
  const rows = flattenLayers(store.treeNodes.slice().reverse());
  if (!searchText.value.trim()) return rows;
  return rows.filter(row => matchesSearch(`${row.node.label || ''} ${row.node.type}`));
});
</script>

<style scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Ensure container handles overflow */
  background: var(--panel-bg);
}

.sidebar-top {
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(150%) blur(10px);
  flex-shrink: 0;
}

.scenes-manager {
  margin-bottom: 16px;
}

.scenes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.scenes-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.scenes-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
}

.scene-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--el-text-color-regular);
  transition: all 0.2s;
  border: 1px solid transparent;
}

.scene-item:hover {
  background-color: var(--el-fill-color-light);
}

.scene-item.active {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}

.scene-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.scene-rename-input {
  flex: 1;
  margin-right: 8px;
}

.scene-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.scene-item:hover .scene-actions {
  opacity: 1;
}

.scene-action-btn {
  padding: 4px !important;
  height: auto !important;
}

.is-locked {
  color: var(--primary-color);
}

.scene-more {
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
}

.scene-more:hover {
  background-color: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.sidebar-search :deep(.el-input__wrapper) {
  border-radius: 999px;
  background: var(--panel-bg-muted);
  border: 1px solid var(--border-color-light);
  box-shadow: none;
}

.sidebar-search :deep(.el-input__inner) {
  font-size: 12px;
}

.custom-tab-bar {
  display: flex;
  background: var(--panel-bg-muted);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 8px;
  gap: 2px;
}

.custom-tab-item {
  flex: 1;
  text-align: center;
  height: 28px;
  line-height: 28px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.custom-tab-item:hover {
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.04);
}

.custom-tab-item.active {
  background: #fff;
  color: var(--primary-color);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.04);
}

.library-tab-bar {
  display: flex;
  gap: 2px;
  margin: 10px 0 8px;
  padding: 3px;
  border-radius: 10px;
  background: var(--panel-bg-muted);
  border: 1px solid var(--border-color-light);
}

.library-tab-item {
  flex: 1;
  text-align: center;
  height: 28px;
  line-height: 28px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.library-tab-item:hover {
  color: var(--text-primary);
}

.library-tab-item.active {
  background: #fff;
  color: var(--primary-color);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.04);
}

.team-actions {
  margin: 0 0 10px;
}

.import-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.import-summary {
  font-size: 12px;
  color: var(--text-secondary);
}

.sidebar-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-content {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.drag-ghost-container {
  position: fixed;
  top: -2000px;
  left: -2000px;
  pointer-events: none;
  z-index: -1;
  /* 移除所有背景、边框和阴影，确保只有组件本身可见 */
  background: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
}

.tab-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px 16px;
}

.tab-scroll::-webkit-scrollbar {
  width: 4px;
}

.tab-scroll::-webkit-scrollbar-thumb {
  background: var(--primary-light);
  border-radius: 10px;
}

.tab-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.component-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.component-section {
  margin-bottom: 14px;
}

.component-preview-popup {
  width: fit-content;
  min-width: 0;
  max-width: 100%;
  max-height: 60vh;
  overflow: auto;
  padding: 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.component-preview-popup :deep(.editor-component) {
  width: fit-content;
  height: fit-content;
  max-width: 100%;
  max-height: 100%;
}

:global(.component-preview-popper) {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  max-width: calc(100vw - 48px);
}

:global(.component-preview-popper .el-tabs__header) {
  margin: 0;
}

:global(.component-preview-popper .el-tabs__content) {
  overflow: auto;
}

.assets-empty {
  padding: 10px 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 2px;
}

.section-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.section-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-light);
  font-variant-numeric: tabular-nums;
}

.component-item {
  background-color: #fff;
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-md);
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  box-shadow: var(--shadow-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.component-item:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.component-item:active {
  cursor: grabbing;
  transform: translateY(0);
}

.component-icon {
  font-size: 20px;
  color: var(--primary-color);
  background: var(--primary-light);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.component-item:hover .component-icon {
  transform: scale(1.06);
  background: var(--primary-color);
  color: #fff;
}

.layers-panel {
  padding: 2px 0 0;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  margin: 2px 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  color: var(--text-secondary);
}

.layer-item:hover {
  background: var(--panel-bg-muted);
  border-color: var(--border-color-light);
  color: var(--text-primary);
}

.layer-item.selected {
  background: var(--primary-light);
  color: var(--text-primary);
  border-color: rgba(37, 99, 235, 0.18);
  font-weight: 600;
}

.layer-icon {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.layer-name {
  flex: 1;
  font-size: 13px;
  margin-left: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-name :deep(.el-input__wrapper) {
  padding: 0 8px;
  border-radius: 10px;
  height: 28px;
}

.layer-name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.layer-action-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-action-btn:hover {
  background: rgba(17, 24, 39, 0.06);
  color: var(--text-secondary);
}

.assets-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.asset-item {
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-md);
  background: #fff;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.asset-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(37, 99, 235, 0.22);
}

.asset-thumb {
  width: 100%;
  height: 92px;
  object-fit: cover;
  display: block;
  background: #fff;
}

.asset-name {
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
