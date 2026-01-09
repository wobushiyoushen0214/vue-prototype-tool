<template>
  <div class="property-panel">
    <div v-if="selectedNode" class="panel-content">
      <div class="panel-header">
        <div class="node-title-wrapper">
          <h3 v-if="!editingLabel" class="node-title">{{ selectedNode.label }}</h3>
          <el-input
            v-else
            v-model="labelDraft"
            size="small"
            class="node-title-input"
            @blur="commitLabel"
            @keydown.enter.prevent="commitLabel"
            @keydown.esc.prevent="cancelLabel"
          />
          <span class="node-type-tag">{{ getNodeTypeLabel(selectedNode.type) }}</span>
        </div>
        <div class="header-actions">
          <el-button circle plain size="small" @click="toggleEditLabel" title="重命名">
            <el-icon><EditPen /></el-icon>
          </el-button>
          <el-button circle plain size="small" @click="toggleLocked" title="锁定/解锁">
            <el-icon v-if="selectedNode.locked"><Lock /></el-icon>
            <el-icon v-else><Unlock /></el-icon>
          </el-button>
          <el-button circle plain size="small" @click="toggleHidden" title="显示/隐藏">
            <el-icon v-if="selectedNode.hidden"><Hide /></el-icon>
            <el-icon v-else><View /></el-icon>
          </el-button>
          <el-button 
            type="danger" 
            circle 
            plain 
            size="small" 
            @click="handleDelete"
            title="删除组件"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
      
      <el-tabs v-model="activeTab" stretch class="props-tabs">
        <el-tab-pane name="style" label="外观">
          <div class="props-content">
            <el-form label-position="top" class="compact-form">
              <!-- 布局 -->
              <div class="section-title">布局</div>
              <el-row :gutter="10">
                <el-col :span="12">
                  <el-form-item label="X">
                    <el-input v-model="selectedNode.style.left" @change="handleStyleChange">
                      <template #suffix>px</template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="Y">
                    <el-input v-model="selectedNode.style.top" @change="handleStyleChange">
                      <template #suffix>px</template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="宽">
                    <el-input v-model="selectedNode.style.width" @change="handleStyleChange">
                      <template #suffix>px</template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="高">
                    <el-input v-model="selectedNode.style.height" @change="handleStyleChange">
                      <template #suffix>px</template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>

              <!-- 填充与描边 -->
              <el-divider class="prop-divider" />
              <div class="section-title">填充</div>
              
              <el-row :gutter="10">
                <el-col :span="12">
                  <el-form-item label="背景颜色">
                    <div class="color-picker-wrapper">
                      <el-color-picker v-model="selectedNode.style.backgroundColor" @change="handleStyleChange" />
                      <span class="color-value" :class="{ empty: !selectedNode.style.backgroundColor }">
                        {{ selectedNode.style.backgroundColor || '未设置' }}
                      </span>
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="文本颜色">
                    <div class="color-picker-wrapper">
                      <el-color-picker v-model="selectedNode.style.color" @change="handleStyleChange" />
                      <span class="color-value" :class="{ empty: !selectedNode.style.color }">
                        {{ selectedNode.style.color || '未设置' }}
                      </span>
                    </div>
                  </el-form-item>
                </el-col>
              </el-row>

              <!-- 圆角与不透明度 -->
              <el-divider class="prop-divider" />
              <div class="section-title">效果</div>
              
              <el-row :gutter="10">
                 <el-col :span="12">
                  <el-form-item label="圆角">
                    <el-input-number 
                      :model-value="getPxNumber(selectedNode.style.borderRadius)"
                      @update:model-value="setPxStyle('borderRadius', $event)"
                      :min="0"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="不透明度">
                    <el-input-number 
                      :model-value="getOpacity(selectedNode.style.opacity)"
                      @update:model-value="setOpacity($event)"
                      :min="0" :max="1" :step="0.1"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="层级">
                    <el-input-number
                      :model-value="getZIndex(selectedNode.style.zIndex)"
                      @update:model-value="handleNumberStyleChange('zIndex', $event)"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="旋转">
                    <el-input-number
                      :model-value="getRotateDeg(selectedNode.style.transform)"
                      @update:model-value="setRotateDeg($event)"
                      :step="1"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <!-- Auto Layout (Flexbox) - 仅容器显示 -->
              <template v-if="selectedNode.type === 'container'">
                <el-divider class="prop-divider" />
                <div class="section-title">自动布局 (Auto Layout)</div>
                <el-form-item label="布局模式">
                  <el-radio-group v-model="selectedNode.style.display" @change="handleStyleChange" size="small">
                    <el-radio-button label="block">绝对定位</el-radio-button>
                    <el-radio-button label="flex">弹性布局</el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <template v-if="selectedNode.style.display === 'flex'">
                  <el-row :gutter="10">
                    <el-col :span="12">
                      <el-form-item label="方向">
                        <el-select v-model="selectedNode.style.flexDirection" @change="handleStyleChange" size="small">
                          <el-option label="水平 (Row)" value="row" />
                          <el-option label="垂直 (Column)" value="column" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="间距 (Gap)">
                        <el-input v-model="selectedNode.style.gap" @change="handleStyleChange" size="small" />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-form-item label="主轴对齐 (Justify)">
                    <el-select v-model="selectedNode.style.justifyContent" @change="handleStyleChange" size="small" style="width: 100%">
                      <el-option label="起点 (Start)" value="flex-start" />
                      <el-option label="居中 (Center)" value="center" />
                      <el-option label="终点 (End)" value="flex-end" />
                      <el-option label="两端对齐 (Between)" value="space-between" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="交叉轴对齐 (Align)">
                    <el-select v-model="selectedNode.style.alignItems" @change="handleStyleChange" size="small" style="width: 100%">
                      <el-option label="起点 (Start)" value="flex-start" />
                      <el-option label="居中 (Center)" value="center" />
                      <el-option label="终点 (End)" value="flex-end" />
                      <el-option label="拉伸 (Stretch)" value="stretch" />
                    </el-select>
                  </el-form-item>
                </template>
              </template>

              <el-divider class="prop-divider" />
              <div class="section-title">边框与阴影</div>

              <el-row :gutter="10">
                <el-col :span="12">
                  <el-form-item label="边框宽度">
                    <el-input-number
                      :model-value="getPxNumber(selectedNode.style.borderWidth)"
                      @update:model-value="setPxStyle('borderWidth', $event)"
                      :min="0"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="边框样式">
                    <el-select v-model="selectedNode.style.borderStyle" @change="handleStyleChange" style="width: 100%">
                      <el-option label="Solid" value="solid" />
                      <el-option label="Dashed" value="dashed" />
                      <el-option label="Dotted" value="dotted" />
                      <el-option label="None" value="none" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="边框颜色">
                    <div class="color-picker-wrapper">
                      <el-color-picker v-model="selectedNode.style.borderColor" @change="handleStyleChange" />
                      <span class="color-value" :class="{ empty: !selectedNode.style.borderColor }">
                        {{ selectedNode.style.borderColor || '未设置' }}
                      </span>
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="阴影">
                    <el-input
                      v-model="selectedNode.style.boxShadow"
                      @change="handleStyleChange"
                      placeholder="例如：0 6px 16px rgba(0,0,0,0.12)"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              
              <!-- 字体设置 -->
              <el-divider class="prop-divider" />
              <div class="section-title">文字</div>

              <el-row :gutter="10">
                <el-col :span="12">
                  <el-form-item label="字号">
                    <el-input v-model="selectedNode.style.fontSize" @change="handleStyleChange" placeholder="例如：14px" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="字重">
                    <el-select v-model="selectedNode.style.fontWeight" @change="handleStyleChange" style="width: 100%">
                      <el-option label="Normal" value="normal" />
                      <el-option label="Medium" value="500" />
                      <el-option label="Bold" value="bold" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="对齐">
                    <el-select v-model="selectedNode.style.textAlign" @change="handleStyleChange" style="width: 100%">
                      <el-option label="Left" value="left" />
                      <el-option label="Center" value="center" />
                      <el-option label="Right" value="right" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="行高">
                    <el-input v-model="selectedNode.style.lineHeight" @change="handleStyleChange" placeholder="例如：20px / 1.5" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-divider class="prop-divider" />
              <div class="section-title">间距</div>

              <el-row :gutter="10">
                <el-col :span="12">
                  <el-form-item label="内边距">
                    <el-input v-model="selectedNode.style.padding" @change="handleStyleChange" placeholder="例如：8px 12px" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="外边距">
                    <el-input v-model="selectedNode.style.margin" @change="handleStyleChange" placeholder="例如：0 auto" />
                  </el-form-item>
                </el-col>
              </el-row>

            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane name="props" label="属性">
          <div class="props-content">
            <el-form label-position="top" class="compact-form">
              <!-- 基于元数据的动态属性编辑器 -->
              <template v-if="currentComponentSchema?.propsMeta">
                <div v-for="(meta, key) in currentComponentSchema.propsMeta" :key="key">
                  <el-form-item :label="meta.label">
                    <!-- 字符串类型 -->
                    <el-input 
                      v-if="meta.type === 'string'" 
                      v-model="selectedNode.props[key]" 
                      @change="handlePropChange" 
                    />
                    
                    <!-- 数字类型 -->
                    <el-input-number 
                      v-else-if="meta.type === 'number'" 
                      v-model="selectedNode.props[key]" 
                      @change="handlePropChange"
                      :step="meta.step"
                      :min="meta.min"
                      :max="meta.max"
                      controls-position="right"
                      style="width: 100%"
                    />
                    
                    <!-- 布尔类型 -->
                    <el-switch 
                      v-else-if="meta.type === 'boolean'" 
                      v-model="selectedNode.props[key]" 
                      @change="handlePropChange" 
                    />
                    
                    <!-- 选择器类型 -->
                    <el-select 
                      v-else-if="meta.type === 'select'" 
                      v-model="selectedNode.props[key]" 
                      @change="handlePropChange"
                      style="width: 100%"
                    >
                      <el-option 
                        v-for="opt in meta.options" 
                        :key="opt.value" 
                        :label="opt.label" 
                        :value="opt.value" 
                      />
                    </el-select>
                    
                    <!-- 颜色类型 -->
                    <el-color-picker 
                      v-else-if="meta.type === 'color'" 
                      v-model="selectedNode.props[key]" 
                      @change="handlePropChange" 
                    />

                    <el-autocomplete
                      v-else-if="meta.type === 'icon'"
                      v-model="selectedNode.props[key]"
                      :fetch-suggestions="queryIconSuggestions"
                      @change="handlePropChange"
                      clearable
                    />

                    <div v-else-if="meta.type === 'array'" class="options-list-container">
                      <div class="options-header">
                        <span>{{ meta.label }}</span>
                        <el-button 
                          type="primary" 
                          link 
                          @click="addArrayItem(String(key), meta)"
                        >
                          <el-icon><Plus /></el-icon>
                          <span>添加选项</span>
                        </el-button>
                      </div>
                      
                      <div
                        v-for="(item, index) in (Array.isArray(selectedNode.props[key]) ? selectedNode.props[key] : [])"
                        :key="index"
                        class="option-item-card"
                      >
                        <div class="option-card-header">
                          <span class="option-index">{{ index + 1 }}</span>
                          <div class="array-item-actions">
                            <el-button
                              size="small"
                              link
                              :disabled="index === 0"
                              @click="moveArrayItem(String(key), index, -1)"
                            >
                              <el-icon><CaretTop /></el-icon>
                            </el-button>
                            <el-button
                              size="small"
                              link
                              :disabled="index === selectedNode.props[key].length - 1"
                              @click="moveArrayItem(String(key), index, 1)"
                            >
                              <el-icon><CaretBottom /></el-icon>
                            </el-button>
                            <el-button
                              size="small"
                              link
                              type="danger"
                              @click="removeArrayItem(String(key), index)"
                            >
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </div>
                        </div>

                        <div class="option-card-body">
                          <div
                            v-for="(childMeta, childKey) in meta.properties"
                            :key="childKey"
                            class="option-field"
                            :class="{ 'option-field--full': childKey === 'description' || childKey === 'content' || childKey === 'address' }"
                          >
                            <span class="field-label">{{ childMeta.label }}</span>
                            <el-input
                              v-if="childMeta.type === 'string'"
                              v-model="selectedNode.props[key][index][childKey]"
                              @change="handlePropChange"
                              size="small"
                              :type="childKey === 'description' ? 'textarea' : 'text'"
                              :rows="childKey === 'description' ? 3 : 1"
                            />
                            <el-input-number
                              v-else-if="childMeta.type === 'number'"
                              v-model="selectedNode.props[key][index][childKey]"
                              @change="handlePropChange"
                              size="small"
                              controls-position="right"
                              style="width: 100%"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </el-form-item>
                </div>
              </template>

              <!-- 兜底：如果没有元数据，则根据值类型简单迭代 -->
              <template v-else>
                <div v-for="(value, key) in selectedNode.props" :key="key">
                  <!-- 忽略一些内部或复杂的属性 -->
                  <el-form-item v-if="key !== 'options'" :label="key">
                    <el-input v-if="typeof value === 'string'" v-model="selectedNode.props[key]" @change="handlePropChange" />
                    <el-switch v-else-if="typeof value === 'boolean'" v-model="selectedNode.props[key]" @change="handlePropChange" />
                    <el-input-number v-else-if="typeof value === 'number'" v-model="selectedNode.props[key]" @change="handlePropChange" controls-position="right" style="width: 100%" />
                    <div v-else>{{ value }}</div>
                  </el-form-item>
                </div>
              </template>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
      
      <div class="panel-footer">
        <el-button type="danger" class="delete-btn" plain @click="handleDelete">删除图层</el-button>
      </div>
    </div>
    
    <div v-else class="canvas-settings">
      <div class="panel-header">
        <h3 class="node-title">
          {{ isMultiScene ? `已选中 ${store.selectedSceneIds.length} 个画布` : '画布设置' }}
        </h3>
        <div class="header-actions">
          <el-button 
            circle 
            plain 
            size="small" 
            @click="toggleAllLock" 
            :title="allLocked ? '解锁尺寸' : '锁定尺寸'"
            v-if="selectedScenes.length > 0"
          >
            <el-icon v-if="allLocked"><Lock /></el-icon>
            <el-icon v-else><Unlock /></el-icon>
          </el-button>
        </div>
      </div>
      <div class="panel-content-inner" v-if="selectedScenes.length > 0">
        <el-form label-position="top" class="compact-form">
          <el-row :gutter="10" v-if="!isMultiScene && store.currentScene">
            <el-col :span="12">
              <el-form-item label="位置 X">
                <el-input-number 
                  v-model="store.currentScene.x" 
                  controls-position="right" 
                  style="width: 100%" 
                  @change="store.saveHistory()"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="位置 Y">
                <el-input-number 
                  v-model="store.currentScene.y" 
                  controls-position="right" 
                  style="width: 100%" 
                  @change="store.saveHistory()"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="宽度">
            <el-input-number 
              v-model="mixedWidth" 
              :disabled="allLocked"
              :placeholder="mixedWidth === undefined ? '混合' : ''"
              controls-position="right" 
              style="width: 100%" 
            />
          </el-form-item>
          <el-form-item label="高度">
            <el-input-number 
              v-model="mixedHeight" 
              :disabled="allLocked"
              :placeholder="mixedHeight === undefined ? '混合' : ''"
              controls-position="right" 
              style="width: 100%" 
            />
          </el-form-item>
          <el-form-item label="背景颜色">
            <div class="color-picker-wrapper">
              <el-color-picker v-model="mixedBgColor" />
              <span class="color-value" :class="{ empty: !mixedBgColor }">
                {{ mixedBgColor || (mixedBgColor === undefined ? '混合' : '未设置') }}
              </span>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditorStore } from '@/store/editor';
import { elementPlusComponents } from '@/config/component-list';
import type { PropMeta } from '@/types/editor';
import * as Icons from '@element-plus/icons-vue';

const { Delete, Plus, CaretTop, CaretBottom, EditPen, Lock, Unlock, View, Hide } = Icons;

const store = useEditorStore();
  const activeTab = ref<'style' | 'props'>('style');

  // --- 画布多选逻辑 ---
  const selectedScenes = computed(() => {
    return store.scenes.filter(s => store.selectedSceneIds.includes(s.id));
  });

  const isMultiScene = computed(() => store.selectedSceneIds.length > 1);

  // 混合属性获取与设置
  const getMixedConfig = (key: keyof import('@/types/editor').ProjectConfig) => {
    if (!isMultiScene.value) return store.currentScene?.config[key];
    const firstValue = selectedScenes.value[0]?.config[key];
    const isSame = selectedScenes.value.every(s => s.config[key] === firstValue);
    return isSame ? firstValue : undefined;
  };

  const updateMixedConfig = (key: keyof import('@/types/editor').ProjectConfig, value: any) => {
    if (value === undefined || value === null) return;
    store.updateSelectedScenesConfig({ [key]: value });
    store.saveHistory();
  };

  const mixedWidth = computed({
    get: () => getMixedConfig('width') as number,
    set: (val) => updateMixedConfig('width', val)
  });

  const mixedHeight = computed({
    get: () => getMixedConfig('height') as number,
    set: (val) => updateMixedConfig('height', val)
  });

  const mixedBgColor = computed({
    get: () => getMixedConfig('backgroundColor') as string,
    set: (val) => updateMixedConfig('backgroundColor', val)
  });

  const allLocked = computed(() => {
    return selectedScenes.value.every(s => s.config.lockSize);
  });

  const toggleAllLock = () => {
    const target = !allLocked.value;
    store.updateSelectedScenesConfig({ lockSize: target });
    store.saveHistory();
  };

  const selectedNode = computed(() => store.firstSelectedNode);
const editingLabel = ref(false);
const labelDraft = ref('');

const currentComponentSchema = computed(() => {
  const node = selectedNode.value;
  if (!node) return null;
  
  // 查找匹配的组件定义
  return Object.values(elementPlusComponents)
    .flat()
    .find(c => c.type === node.type) || null;
});

const getNodeTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    'el-button': '按钮',
    'el-input': '输入框',
    'el-input-number': '数字输入',
    'el-select': '选择器',
    'el-switch': '开关',
    'el-radio-group': '单选框',
    'el-checkbox-group': '多选框',
    'el-slider': '滑块',
    'el-time-picker': '时间选择',
    'el-date-picker': '日期选择',
    'el-rate': '评分',
    'el-color-picker': '颜色选择',
    'el-tag': '标签',
    'el-progress': '进度条',
    'el-badge': '徽章',
    'el-avatar': '头像',
    'el-card': '卡片',
    'el-empty': '空状态',
    'el-image': '图片',
    'el-table': '表格',
    'el-pagination': '分页',
    'el-menu': '菜单',
    'el-tabs': '标签页',
    'el-breadcrumb': '面包屑',
    'el-steps': '步骤条',
    'el-dropdown': '下拉菜单',
    'el-page-header': '页头',
    'el-alert': '警告',
    'el-skeleton': '骨架屏',
    'el-upload': '上传',
    'el-descriptions': '描述列表',
    'el-timeline': '时间线',
    'el-carousel': '走马灯',
    'el-collapse': '折叠面板',
    'TeamCard': '团队卡片'
  };
  return map[type] || type;
};

const toggleEditLabel = async () => {
  if (!selectedNode.value) return;
  if (editingLabel.value) {
    commitLabel();
    return;
  }
  editingLabel.value = true;
  labelDraft.value = selectedNode.value.label || '';
  await Promise.resolve();
  requestAnimationFrame(() => {
    const input = document.querySelector('.node-title-input input') as HTMLInputElement | null;
    input?.focus();
    input?.select();
  });
};

const commitLabel = () => {
  if (!selectedNode.value) return;
  const next = labelDraft.value.trim() || '未命名';
  store.updateNodeLabel(selectedNode.value.id, next);
  editingLabel.value = false;
};

const cancelLabel = () => {
  editingLabel.value = false;
};

const toggleLocked = () => {
  if (!selectedNode.value) return;
  store.toggleNodeLocked(selectedNode.value.id);
};

const toggleHidden = () => {
  if (!selectedNode.value) return;
  store.toggleNodeHidden(selectedNode.value.id);
};

const handlePropChange = () => {
  if (selectedNode.value) {
    store.updateNodeProps(selectedNode.value.id, { ...selectedNode.value.props });
  }
};

const ensureArrayValue = (key: string) => {
  if (!selectedNode.value) return;
  const current = selectedNode.value.props[key];
  if (!Array.isArray(current)) {
    selectedNode.value.props[key] = [];
  }
};

const createDefaultValue = (meta?: PropMeta) => {
  if (!meta) return '';
  if (meta.type === 'string') return '';
  if (meta.type === 'number') return 0;
  if (meta.type === 'boolean') return false;
  if (meta.type === 'select') return meta.options?.[0]?.value ?? '';
  if (meta.type === 'color') return '#409eff';
  if (meta.type === 'array') return [];
  return '';
};

const addArrayItem = (key: string, meta: PropMeta) => {
  if (!selectedNode.value) return;
  ensureArrayValue(key);

  if (meta.itemType === 'object' && meta.properties) {
    const newItem: Record<string, any> = {};
    Object.entries(meta.properties).forEach(([childKey, childMeta]) => {
      newItem[childKey] = createDefaultValue(childMeta);
    });
    selectedNode.value.props[key].push(newItem);
    handlePropChange();
    return;
  }
};

const removeArrayItem = (key: string, index: number) => {
  if (!selectedNode.value) return;
  ensureArrayValue(key);
  selectedNode.value.props[key].splice(index, 1);
  handlePropChange();
};

const moveArrayItem = (key: string, index: number, delta: number) => {
  if (!selectedNode.value) return;
  ensureArrayValue(key);
  const list = selectedNode.value.props[key];
  const nextIndex = index + delta;
  if (!Array.isArray(list)) return;
  if (nextIndex < 0 || nextIndex >= list.length) return;
  const [moved] = list.splice(index, 1);
  list.splice(nextIndex, 0, moved);
  handlePropChange();
};

const iconNames = Object.keys(Icons).filter((k) => k !== 'default').sort();

const queryIconSuggestions = (queryString: string, cb: (results: { value: string }[]) => void) => {
  const q = String(queryString || '').trim().toLowerCase();
  const matched = (q ? iconNames.filter((n) => n.toLowerCase().includes(q)) : iconNames).slice(0, 50);
  cb(matched.map((value) => ({ value })));
};

const handleStyleChange = () => {
   if (selectedNode.value) {
    store.updateNodeStyle(selectedNode.value.id, { ...selectedNode.value.style });
  }
};

const handleNumberStyleChange = (key: string, value: any) => {
  if (selectedNode.value) {
    // 确保加上单位
    const styleValue = key === 'borderRadius' ? `${value}px` : value;
    store.updateNodeStyle(selectedNode.value.id, { [key]: styleValue });
  }
};

const getPxNumber = (value: any) => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
};

const getZIndex = (val: any) => {
  if (val === undefined || val === null || val === '' || val === 'auto') return 1;
  const n = Number.parseInt(String(val));
  return Number.isFinite(n) ? n : 1;
};

const getOpacity = (val: any) => {
  if (val === undefined || val === null || val === '') return 1;
  const n = Number.parseFloat(String(val));
  return Number.isFinite(n) ? n : 1;
};

const setOpacity = (val: number | null) => {
  if (val === null || !selectedNode.value) return;
  store.updateNodeStyle(selectedNode.value.id, { opacity: val });
};

const setPxStyle = (key: string, value: any) => {
  if (!selectedNode.value) return;
  const n = value === null || value === undefined ? 0 : Number(value);
  store.updateNodeStyle(selectedNode.value.id, { [key]: `${Number.isFinite(n) ? n : 0}px` });
};

const getRotateDeg = (transform: any) => {
  const str = String(transform || '');
  const match = str.match(/rotate\(([-\d.]+)deg\)/);
  if (!match) return 0;
  const n = Number.parseFloat(match[1] || '0');
  return Number.isFinite(n) ? n : 0;
};

const setRotateDeg = (deg: any) => {
  if (!selectedNode.value) return;
  const n = deg === null || deg === undefined ? 0 : Number(deg);
  const safe = Number.isFinite(n) ? n : 0;
  const current = String(selectedNode.value.style.transform || '');
  const withoutRotate = current.replace(/rotate\(([-\d.]+)deg\)/g, '').trim();
  const next = `${withoutRotate} rotate(${safe}deg)`.trim();
  store.updateNodeStyle(selectedNode.value.id, { transform: next });
};

const handleDelete = () => {
  store.deleteSelectedNodes();
};
</script>

<style scoped>
.property-panel {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--panel-bg);
}

.panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  padding: 10px 16px 8px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px 10px;
  min-height: 48px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(150%) blur(10px);
  z-index: 10;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
}

.node-title-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
  flex: 1 1 200px;
  padding-right: 0;
}

.node-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.2;
}

.node-title-input {
  width: 100%;
  max-width: 240px;
}

.node-title-input :deep(.el-input__wrapper) {
  height: 30px;
  border-radius: 10px;
}

.node-type-tag {
  font-size: 10px;
  color: var(--text-light);
  font-weight: 500;
  margin-top: 2px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 24px 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: "";
  display: block;
  width: 3px;
  height: 12px;
  background-color: var(--primary-color);
  border-radius: 2px;
}

.props-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.props-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
}

.props-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.props-tabs :deep(.el-tabs__item) {
  font-size: 12px;
  height: 40px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.props-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  height: 0;
  overflow-y: auto;
}

/* 自定义滚动条 */
.props-tabs :deep(.el-tabs__content)::-webkit-scrollbar {
  width: 4px;
}

.props-tabs :deep(.el-tabs__content)::-webkit-scrollbar-thumb {
  background: var(--primary-light);
  border-radius: 10px;
}

.props-tabs :deep(.el-tabs__content)::-webkit-scrollbar-track {
  background: transparent;
}

.props-content {
  padding: 0 16px 24px;
}

.prop-divider {
  margin: 16px 0 !important;
  border-top-color: var(--border-color-light) !important;
}

/* 表单项样式优化 */
:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
  margin-bottom: 4px;
  line-height: 1.5;
}

:deep(.el-input-number.is-controls-right .el-input__wrapper) {
  padding-left: 8px;
  padding-right: 32px;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  padding: 0 8px;
  border-radius: 6px;
  width: 100%;
  transition: all 0.2s ease;
  height: 32px;
  background: #fff;
}

.color-picker-wrapper:hover {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.color-picker-wrapper :deep(.el-color-picker) {
  display: flex;
  align-items: center;
}

.color-picker-wrapper :deep(.el-color-picker__trigger) {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.color-picker-wrapper :deep(.el-color-picker__icon),
.color-picker-wrapper :deep(.el-color-picker__empty) {
  display: none;
}

.color-value {
  flex: 1;
  font-size: 11px;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.color-value.empty {
  color: var(--text-light);
}

/* 底部操作区 */
.panel-footer {
  padding: 20px;
  border-top: 1px solid var(--border-color-light);
  background: var(--panel-bg);
}

.delete-btn {
  width: 100%;
  height: 40px;
  border-radius: var(--radius-md);
  font-weight: 500;
  letter-spacing: 1px;
  transition: all 0.3s;
  border: 1px solid #ffeded !important;
  background: #fff !important;
  color: #f56c6c !important;
  
  &:hover {
    background: #f56c6c !important;
    color: #fff !important;
    border-color: #f56c6c !important;
    box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
  }
}

.array-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.options-list-container {
  margin-top: 12px;
}

.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  span {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.option-item-card {
  background: #fff;
  border: 1px solid var(--border-color-light);
  border-radius: 10px;
  margin-bottom: 12px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.option-item-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.option-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.option-index {
  width: 20px;
  height: 20px;
  background: var(--primary-color);
  color: #fff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
}

.option-card-body {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.option-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.option-field .field-label {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.option-field--full {
  grid-column: 1 / -1;
}

.array-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.option-item-card:hover .array-item-actions {
  opacity: 1;
}

:deep(.el-input--small .el-input__wrapper) {
  padding: 1px 8px;
  background-color: #f5f7fa;
  box-shadow: none !important;
  border: 1px solid transparent;
  transition: all 0.2s;
}

:deep(.el-input--small .el-input__wrapper:hover) {
  background-color: #fff;
  border-color: var(--primary-color);
}

:deep(.el-input--small.is-focus .el-input__wrapper) {
  background-color: #fff;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color) inset !important;
}

.array-item-actions :deep(.el-button) {
  padding: 4px;
  height: 24px;
  width: 24px;
}

.array-item-actions :deep(.el-button [class^=el-icon]) {
  font-size: 14px;
}

:deep(.el-textarea__inner) {
  padding: 8px;
  font-size: 12px;
  background-color: #f8fafc;
  border: 1px solid transparent;
  transition: all 0.2s;
  resize: none;
}

:deep(.el-textarea__inner:hover) {
  background-color: #fff;
  border-color: var(--primary-color);
}

:deep(.el-textarea__inner:focus) {
  background-color: #fff;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color) inset;
}

.array-item-actions :deep(.el-button .el-icon) {
  margin: 0 !important;
  font-size: 14px;
}

.array-sub-item :deep(.el-form-item__label) {
  font-size: 11px;
}

.array-unsupported {
  color: var(--text-light);
  font-size: 11px;
  line-height: 20px;
  font-style: italic;
}

.add-button-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.add-item-btn {
  padding: 8px 0 !important;
  height: 32px !important;
  width: 32px !important;
  min-width: 32px !important;
  border-radius: 16px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  display: flex !important;
  justify-content: center !important;
  overflow: hidden !important;
}

.add-item-btn:hover {
  width: 72px !important;
  padding: 8px 12px !important;
}

.add-item-btn span {
  display: none;
  opacity: 0;
  white-space: nowrap;
}

.add-item-btn:hover span {
  display: inline;
  opacity: 1;
  margin-left: 6px;
}

.add-item-btn .el-icon {
  font-size: 16px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-light);
}

.canvas-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-content-inner {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
</style>
