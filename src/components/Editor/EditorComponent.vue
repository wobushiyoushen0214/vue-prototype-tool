<template>
  <div class="editor-component" :style="wrapperStyle">
    <!-- 编辑模式下的遮罩层，防止组件内部事件干扰拖拽 -->
    <div v-if="!isPreview && type !== 'container'" class="component-mask"></div>
    
    <!-- 内置组件 (Legacy) -->
    <template v-if="type === 'text'">
      <div :style="innerStyle">{{ props.text }}</div>
    </template>
    <template v-else-if="type === 'button'">
      <el-button :type="props.type" :style="getComponentStyle()">{{ props.text }}</el-button>
    </template>
    <template v-else-if="type === 'image'">
      <img :src="props.src" :style="getComponentStyle({ objectFit: 'cover' })" draggable="false" />
    </template>

    <template v-else-if="type === 'container'">
      <div
        class="is-container"
        :style="{
          position: 'relative',
          display: props.display || 'block',
          flexDirection: props.flexDirection || 'row',
          justifyContent: props.justifyContent || 'flex-start',
          alignItems: props.alignItems || 'flex-start',
          gap: (props.gap || 0) + 'px',
          ...getComponentStyle({ overflow: 'visible' })
        }"
      >
        <slot></slot>
      </div>
    </template>
    
    <!-- Element Plus 组件 -->
    <template v-else-if="type.startsWith('el-')">
       <!-- 图标特殊处理 -->
       <el-icon v-if="type === 'el-icon'" :size="props.size" :color="props.color">
         <component :is="props.name" />
       </el-icon>

       <el-badge v-else-if="type === 'el-badge'" v-bind="props" :style="getComponentStyle()">
         <el-button size="small" type="primary">内容</el-button>
       </el-badge>
       
       <!-- 选择器特殊处理 -->
       <el-select v-else-if="type === 'el-select'" v-bind="props" :style="getComponentStyle()">
         <el-option 
           v-for="opt in (props.options || [{label: '选项1', value: '1'}, {label: '选项2', value: '2'}])" 
           :key="opt.value" 
           :label="opt.label" 
           :value="opt.value" 
         />
       </el-select>

       <!-- 单选框组特殊处理 -->
       <el-radio-group v-else-if="type === 'el-radio-group'" v-bind="props">
         <el-radio 
           v-for="opt in (props.options || [{label: '备选项1', value: '1'}, {label: '备选项2', value: '2'}])" 
           :key="opt.value" 
           :value="opt.value"
         >
           {{ opt.label }}
         </el-radio>
       </el-radio-group>

       <!-- 多选框组特殊处理 -->
       <el-checkbox-group v-else-if="type === 'el-checkbox-group'" v-bind="props">
         <el-checkbox 
           v-for="opt in (props.options || [{label: '备选项1', value: '1'}, {label: '备选项2', value: '2'}])" 
           :key="opt.value" 
           :value="opt.value"
         >
           {{ opt.label }}
         </el-checkbox>
       </el-checkbox-group>
       
       <!-- 菜单特殊处理 -->
       <el-menu v-else-if="type === 'el-menu'" v-bind="props" :style="getComponentStyle()">
         <el-menu-item v-for="item in (props.items || [])" :key="item.index" :index="item.index">
           {{ item.label }}
         </el-menu-item>
       </el-menu>

       <!-- 标签页特殊处理 -->
       <el-tabs v-else-if="type === 'el-tabs'" v-bind="props" :style="getComponentStyle()">
         <el-tab-pane 
           v-for="item in (props.items || [])" 
           :key="item.name" 
           :label="item.label" 
           :name="item.name"
         >
           {{ item.content }}
         </el-tab-pane>
       </el-tabs>

       <!-- 面包屑特殊处理 -->
       <el-breadcrumb v-else-if="type === 'el-breadcrumb'" v-bind="props">
         <el-breadcrumb-item v-for="(item, index) in (props.items || [])" :key="index" :to="item.to">
           {{ item.label }}
         </el-breadcrumb-item>
       </el-breadcrumb>

       <!-- 步骤条特殊处理 -->
       <el-steps v-else-if="type === 'el-steps'" v-bind="props" :style="getComponentStyle()">
         <el-step 
           v-for="(item, index) in (props.items || [])" 
           :key="index" 
           :title="item.title" 
           :description="item.description" 
         />
       </el-steps>

       <!-- 下拉菜单特殊处理 -->
       <el-dropdown v-else-if="type === 'el-dropdown'" v-bind="props">
         <span v-if="!props.splitButton">
            <el-button :type="props.type" :size="props.size">
              {{ props.label }}<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
         </span>
         <span v-else>
            {{ props.label }}
         </span>
         <template #dropdown>
           <el-dropdown-menu>
             <el-dropdown-item 
               v-for="(item, index) in (props.items || [])" 
               :key="index" 
               :command="item.command"
               :disabled="item.disabled"
               :divided="item.divided"
             >
               {{ item.label }}
             </el-dropdown-item>
           </el-dropdown-menu>
         </template>
       </el-dropdown>

       <!-- 页头特殊处理 -->
       <el-page-header v-else-if="type === 'el-page-header'" v-bind="props" :style="getComponentStyle()">
         <template #content>
           <span class="text-large font-600 mr-3"> {{ props.content }} </span>
         </template>
       </el-page-header>

       <el-upload v-else-if="type === 'el-upload'" v-bind="uploadProps" :http-request="mockUploadRequest" :style="getComponentStyle()">
         <el-button type="primary">{{ uploadButtonText }}</el-button>
       </el-upload>

       <el-table v-else-if="type === 'el-table'" v-bind="props" :style="getComponentStyle()">
         <el-table-column
           v-for="col in tableColumns"
           :key="col.prop"
           :prop="col.prop"
           :label="col.label"
         />
       </el-table>

       <el-descriptions v-else-if="type === 'el-descriptions'" v-bind="props" :style="getComponentStyle()">
         <el-descriptions-item
           v-for="(item, index) in descriptionsItems"
           :key="index"
           :label="item.label"
         >
           {{ item.value }}
         </el-descriptions-item>
       </el-descriptions>

       <el-timeline v-else-if="type === 'el-timeline'" v-bind="props" :style="getComponentStyle()">
         <el-timeline-item
           v-for="(item, index) in timelineItems"
           :key="index"
           :timestamp="item.timestamp"
           :type="item.type"
           :hollow="item.hollow"
           :center="item.center"
         >
           {{ item.content }}
         </el-timeline-item>
       </el-timeline>

       <el-carousel v-else-if="type === 'el-carousel'" v-bind="props" :style="getComponentStyle()">
         <el-carousel-item v-for="(item, index) in carouselItems" :key="index">
           <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center">
             {{ item }}
           </div>
         </el-carousel-item>
       </el-carousel>

       <!-- 折叠面板特殊处理 -->
      <el-collapse v-else-if="type === 'el-collapse'" v-bind="props" :style="getComponentStyle()">
        <el-collapse-item
          v-for="(item, index) in collapseItems"
          :key="item.name ?? index"
          :name="item.name"
          :title="item.title"
        >
          {{ item.content }}
        </el-collapse-item>
      </el-collapse>

      <!-- 分页器专用渲染 (遵循 Element Plus 最新规范) -->
      <el-pagination
        v-else-if="type === 'el-pagination'"
        v-model:current-page="safePaginationProps.currentPage"
        v-model:page-size="safePaginationProps.pageSize"
        :total="safePaginationProps.total"
        :page-sizes="[10, 20, 50, 100]"
        :layout="safePaginationProps.layout"
        :background="safePaginationProps.background"
        @current-change="(val: number) => { safePaginationProps.currentPage = val }"
        @size-change="(val: number) => { safePaginationProps.pageSize = val }"
        style="display: flex !important; width: auto !important; height: auto !important; visibility: visible !important;"
      />

      <!-- 通用 Element 组件 -->
       <component 
         v-else
         :is="type"
         v-bind="props"
         :style="getComponentStyle()"
       >
         <!-- 简单的 slot 内容回填 -->
         <template v-if="props.label || props.text">
           {{ props.label || props.text }}
         </template>
       </component>
    </template>

    <!-- 自定义组件渲染 -->
    <component
      v-else-if="isCustomComponent"
      :is="'Custom' + type"
      v-bind="props"
      :style="getComponentStyle()"
    />
    
    <!-- 默认容器样式 -->
    <div v-else :style="{ border: '1px dashed #ccc', ...innerStyle }">
      {{ type }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';
  import * as ElementPlusIconsVue from '@element-plus/icons-vue';

const propsDef = defineProps<{
  type: string;
  props: Record<string, any>;
  style?: Record<string, any>;
  isPreview?: boolean;
}>();

const instance = getCurrentInstance();

const isCustomComponent = computed(() => {
  const componentName = `Custom${propsDef.type}`;
  return instance?.appContext.components[componentName] !== undefined;
});

const uploadButtonText = computed(() => {
  const text = typeof propsDef.props?.label === 'string'
    ? propsDef.props.label
    : (typeof propsDef.props?.text === 'string' ? propsDef.props.text : '');
  return text || '点击上传';
});

const uploadProps = computed(() => {
  const raw = propsDef.props ?? {};
  const action = typeof raw.action === 'string' && raw.action.trim() ? raw.action : '/__mock_upload__';
  const { label, text, ...rest } = raw;
  return {
    ...rest,
    action,
  };
});

const mockUploadRequest = (options: any) => {
  return Promise.resolve().then(() => {
    options?.onSuccess?.({ ok: true }, options?.file);
  });
};

const tableColumns = computed(() => {
  const columns = Array.isArray(propsDef.props?.columns) ? propsDef.props.columns : [];
  if (columns.length > 0) {
    return columns
      .map((col: any) => ({
        prop: typeof col?.prop === 'string' ? col.prop : '',
        label: typeof col?.label === 'string' ? col.label : (typeof col?.prop === 'string' ? col.prop : ''),
      }))
      .filter((col: any) => col.prop);
  }

  const data = Array.isArray(propsDef.props?.data) ? propsDef.props.data : [];
  const first = data[0];
  if (!first || typeof first !== 'object') return [];
  return Object.keys(first).map(key => ({ prop: key, label: key }));
});

const descriptionsItems = computed(() => {
  const items = Array.isArray(propsDef.props?.items) ? propsDef.props.items : [];
  if (items.length > 0) {
    return items.map((item: any) => ({
      label: typeof item?.label === 'string' ? item.label : '',
      value: typeof item?.value === 'string' ? item.value : String(item?.value ?? ''),
    }));
  }
  return [
    { label: '姓名', value: 'Tom' },
    { label: '电话', value: '13800000000' },
    { label: '地址', value: '上海市' },
  ];
});

const timelineItems = computed(() => {
  const items = Array.isArray(propsDef.props?.items) ? propsDef.props.items : [];
  if (items.length > 0) return items;
  return [
    { timestamp: '2026-01-08', content: '创建', type: 'primary', hollow: false, center: false },
    { timestamp: '2026-01-09', content: '处理', type: 'success', hollow: false, center: false },
    { timestamp: '2026-01-10', content: '完成', type: 'info', hollow: true, center: false },
  ];
});

const carouselItems = computed(() => {
  const items = Array.isArray(propsDef.props?.items) ? propsDef.props.items : [];
  if (items.length > 0) return items;
  return ['Slide 1', 'Slide 2', 'Slide 3'];
});

const collapseItems = computed(() => {
  const items = Array.isArray(propsDef.props?.items) ? propsDef.props.items : [];
  if (items.length > 0) return items;
  return [
    { name: '1', title: '一致性 Consistency', content: '与现实生活一致，与用户认知一致。' },
    { name: '2', title: '反馈 Feedback', content: '通过界面元素提供明确反馈。' },
  ];
});

const safePaginationProps = computed(() => {
  const p = propsDef.props || {};
  return {
    total: typeof p.total === 'number' ? p.total : 1000,
    pageSize: typeof p.pageSize === 'number' ? p.pageSize : (typeof p['page-size'] === 'number' ? p['page-size'] : 10),
    currentPage: typeof p.currentPage === 'number' ? p.currentPage : (typeof p['current-page'] === 'number' ? p['current-page'] : 1),
    layout: typeof p.layout === 'string' && p.layout.trim() !== '' 
      ? p.layout 
      : 'prev, pager, next, jumper, ->, sizes, total',
    background: typeof p.background === 'boolean' ? p.background : true,
  };
});

const wrapperStyle = computed(() => {
  // 过滤掉定位相关的样式，只保留外观样式
  const { left, top, position, width, height, ...others } = propsDef.style || {};
  
  if (propsDef.isPreview) {
    return {
      width: width ?? 'auto',
      height: height ?? 'auto',
      maxWidth: '100%',
      maxHeight: '100%',
      overflow: 'visible',
      ...others
    };
  }

  const isAuto = (v: any) => v === undefined || v === null || String(v).trim() === '' || String(v).trim() === 'auto';

  // 分页组件等需要溢出显示的组件，不要 hidden
  const shouldVisible = ['container', 'el-pagination', 'el-dropdown', 'el-select', 'el-date-picker'].includes(propsDef.type);

  return {
    width: isAuto(width) ? 'auto' : '100%',
    height: isAuto(height) ? 'auto' : '100%',
    overflow: shouldVisible ? 'visible' : 'hidden',
    ...others
  };
});

const innerStyle = computed(() => {
  if (propsDef.isPreview) {
    return {};
  }
  return {
    width: '100%',
    height: '100%'
  };
});

// Helper to get component style based on preview mode
const getComponentStyle = (extraStyle: Record<string, any> = {}) => {
  const { width, height } = propsDef.style || {};
  if (propsDef.isPreview) {
    return {
      margin: 0,
      width: width || 'auto',
      height: height || 'auto',
      ...extraStyle
    };
  }
  
  // 特殊处理：分页组件在 auto 宽度时应该使用 max-content 避免被 flex 压缩
  let finalWidth = width ?? '100%';
  if (propsDef.type === 'el-pagination' && (width === 'auto' || !width)) {
    finalWidth = 'max-content';
  }

  return {
    width: finalWidth,
    height: height ?? '100%',
    ...extraStyle
  };
};
</script>

<style scoped>
.editor-component {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}
.component-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  cursor: move;
}
/* 覆盖 Element Plus 组件默认样式以适应容器 */
.editor-component :deep(.el-button),
.editor-component :deep(.el-input),
.editor-component :deep(.el-select) {
  width: 100%;
  height: 100%;
}

/* 修复分页组件内部元素被上方样式强制撑大的问题 */
.editor-component :deep(.el-pagination) .el-input,
.editor-component :deep(.el-pagination) .el-select,
.editor-component :deep(.el-pagination) .el-button,
.editor-component :deep(.el-pagination) .btn-prev,
.editor-component :deep(.el-pagination) .btn-next {
  width: auto;
  height: auto;
}
</style>
