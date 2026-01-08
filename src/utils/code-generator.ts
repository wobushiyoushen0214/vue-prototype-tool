import type { EditorNode, ProjectConfig } from '@/types/editor';

function styleToCss(style: Record<string, any>): string {
  return Object.entries(style)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `  ${kebabKey}: ${value};`;
    })
    .join('\n');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toClassName(id: string): string {
  return `node-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function renderJsExpr(value: any): string {
  return JSON.stringify(value);
}

function renderPropAttr(key: string, value: any): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return `${key}="${escapeAttr(value)}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return `:${key}="${String(value)}"`;
  return `:${key}='${renderJsExpr(value)}'`;
}

function joinAttrs(attrs: Array<string | null | undefined>): string {
  const list = attrs.filter(Boolean) as string[];
  if (list.length === 0) return '';
  return ` ${list.join(' ')}`;
}

function renderCommonAttrs(node: EditorNode, omitKeys: string[] = []): string {
  const attrs: Array<string | null> = [];
  for (const [key, value] of Object.entries(node.props ?? {})) {
    if (omitKeys.includes(key)) continue;
    attrs.push(renderPropAttr(key, value));
  }
  return joinAttrs(attrs);
}

function renderNode(node: EditorNode, depth: number): { template: string; iconImports: string[] } {
  const indent = '  '.repeat(depth);
  const className = toClassName(node.id);

  if (node.type === 'container') {
    const children = Array.isArray(node.children) ? node.children : [];
    const rendered = children.map(child => renderNode(child, depth + 1));
    const template =
      `${indent}<div class="${className}">` +
      (rendered.length ? `\n${rendered.map(r => r.template).join('\n')}\n${indent}` : '') +
      `</div>`;
    return { template, iconImports: rendered.flatMap(r => r.iconImports) };
  }

  if (node.type === 'text') {
    const text = typeof node.props?.text === 'string' ? node.props.text : '';
    return { template: `${indent}<div class="${className}">${escapeText(text)}</div>`, iconImports: [] };
  }

  if (node.type === 'button') {
    const text = typeof node.props?.text === 'string' ? node.props.text : '';
    const attrs = renderCommonAttrs(node, ['text']);
    return { template: `${indent}<el-button class="${className}"${attrs}>${escapeText(text)}</el-button>`, iconImports: [] };
  }

  if (node.type === 'image') {
    const attrs = renderCommonAttrs(node);
    return { template: `${indent}<img class="${className}"${attrs} />`, iconImports: [] };
  }

  if (node.type === 'el-icon') {
    const name = typeof node.props?.name === 'string' ? node.props.name.trim() : '';
    const icon = /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : '';
    const attrs = renderCommonAttrs(node, ['name']);
    if (icon) {
      return {
        template: `${indent}<el-icon class="${className}"${attrs}><${icon} /></el-icon>`,
        iconImports: [icon],
      };
    }
    return { template: `${indent}<el-icon class="${className}"${attrs} />`, iconImports: [] };
  }

  if (node.type === 'el-select') {
    const options = Array.isArray(node.props?.options) ? node.props.options : [];
    const attrs = renderCommonAttrs(node, ['options']);
    return {
      template:
        `${indent}<el-select class="${className}"${attrs}>\n` +
        `${indent}  <el-option v-for='opt in ${renderJsExpr(options)}' :key="opt.value" :label="opt.label" :value="opt.value" />\n` +
        `${indent}</el-select>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-radio-group') {
    const options = Array.isArray(node.props?.options) ? node.props.options : [];
    const attrs = renderCommonAttrs(node, ['options']);
    return {
      template:
        `${indent}<el-radio-group class="${className}"${attrs}>\n` +
        `${indent}  <el-radio v-for='opt in ${renderJsExpr(options)}' :key="opt.value" :value="opt.value">{{ opt.label }}</el-radio>\n` +
        `${indent}</el-radio-group>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-checkbox-group') {
    const options = Array.isArray(node.props?.options) ? node.props.options : [];
    const attrs = renderCommonAttrs(node, ['options']);
    return {
      template:
        `${indent}<el-checkbox-group class="${className}"${attrs}>\n` +
        `${indent}  <el-checkbox v-for='opt in ${renderJsExpr(options)}' :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox>\n` +
        `${indent}</el-checkbox-group>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-menu') {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const attrs = renderCommonAttrs(node, ['items']);
    return {
      template:
        `${indent}<el-menu class="${className}"${attrs}>\n` +
        `${indent}  <el-menu-item v-for='item in ${renderJsExpr(items)}' :key="item.index" :index="item.index">{{ item.label }}</el-menu-item>\n` +
        `${indent}</el-menu>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-tabs') {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const attrs = renderCommonAttrs(node, ['items']);
    return {
      template:
        `${indent}<el-tabs class="${className}"${attrs}>\n` +
        `${indent}  <el-tab-pane v-for='item in ${renderJsExpr(items)}' :key="item.name" :label="item.label" :name="item.name">{{ item.content }}</el-tab-pane>\n` +
        `${indent}</el-tabs>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-breadcrumb') {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const attrs = renderCommonAttrs(node, ['items']);
    return {
      template:
        `${indent}<el-breadcrumb class="${className}"${attrs}>\n` +
        `${indent}  <el-breadcrumb-item v-for='(item, idx) in ${renderJsExpr(items)}' :key="idx" :to="item.to">{{ item.label }}</el-breadcrumb-item>\n` +
        `${indent}</el-breadcrumb>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-steps') {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const attrs = renderCommonAttrs(node, ['items']);
    return {
      template:
        `${indent}<el-steps class="${className}"${attrs}>\n` +
        `${indent}  <el-step v-for='(item, idx) in ${renderJsExpr(items)}' :key="idx" :title="item.title" :description="item.description" />\n` +
        `${indent}</el-steps>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-upload') {
    const text = typeof node.props?.label === 'string' ? node.props.label : (typeof node.props?.text === 'string' ? node.props.text : '');
    const attrs = renderCommonAttrs(node, ['label', 'text']);
    const buttonText = text || '点击上传';
    return {
      template:
        `${indent}<el-upload class="${className}"${attrs}>\n` +
        `${indent}  <el-button type="primary">${escapeText(buttonText)}</el-button>\n` +
        `${indent}</el-upload>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-table') {
    const data = Array.isArray(node.props?.data) ? node.props.data : [];
    const columnsFromProps = Array.isArray(node.props?.columns) ? node.props.columns : [];
    const inferredColumns = (() => {
      const first = data[0];
      if (!first || typeof first !== 'object') return [];
      return Object.keys(first).map(key => ({ prop: key, label: key }));
    })();
    const columns = (columnsFromProps.length ? columnsFromProps : inferredColumns).map((col: any) => ({
      prop: typeof col?.prop === 'string' ? col.prop : '',
      label: typeof col?.label === 'string' ? col.label : (typeof col?.prop === 'string' ? col.prop : ''),
    })).filter((col: any) => col.prop);
    const attrs = renderCommonAttrs(node, ['columns']);
    return {
      template:
        `${indent}<el-table class="${className}"${attrs}>\n` +
        `${indent}  <el-table-column v-for='col in ${renderJsExpr(columns)}' :key="col.prop" :prop="col.prop" :label="col.label" />\n` +
        `${indent}</el-table>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-descriptions') {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const attrs = renderCommonAttrs(node, ['items']);
    return {
      template:
        `${indent}<el-descriptions class="${className}"${attrs}>\n` +
        `${indent}  <el-descriptions-item v-for='(item, idx) in ${renderJsExpr(items)}' :key="idx" :label="item.label">{{ item.value }}</el-descriptions-item>\n` +
        `${indent}</el-descriptions>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-timeline') {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const attrs = renderCommonAttrs(node, ['items']);
    return {
      template:
        `${indent}<el-timeline class="${className}"${attrs}>\n` +
        `${indent}  <el-timeline-item v-for='(item, idx) in ${renderJsExpr(items)}' :key="idx" :timestamp="item.timestamp" :type="item.type" :hollow="item.hollow" :center="item.center">{{ item.content }}</el-timeline-item>\n` +
        `${indent}</el-timeline>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-carousel') {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const attrs = renderCommonAttrs(node, ['items']);
    return {
      template:
        `${indent}<el-carousel class="${className}"${attrs}>\n` +
        `${indent}  <el-carousel-item v-for='(item, idx) in ${renderJsExpr(items)}' :key="idx">{{ item }}</el-carousel-item>\n` +
        `${indent}</el-carousel>`,
      iconImports: [],
    };
  }

  if (node.type === 'el-collapse') {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const attrs = renderCommonAttrs(node, ['items']);
    return {
      template:
        `${indent}<el-collapse class="${className}"${attrs}>\n` +
        `${indent}  <el-collapse-item v-for='(item, idx) in ${renderJsExpr(items)}' :key="item.name ?? idx" :name="item.name" :title="item.title">{{ item.content }}</el-collapse-item>\n` +
        `${indent}</el-collapse>`,
      iconImports: [],
    };
  }

  if (node.type.startsWith('el-')) {
    const slotText = typeof node.props?.label === 'string' ? node.props.label : (typeof node.props?.text === 'string' ? node.props.text : '');
    const attrs = renderCommonAttrs(node, ['label', 'text']);
    if (slotText) {
      return { template: `${indent}<${node.type} class="${className}"${attrs}>${escapeText(slotText)}</${node.type}>`, iconImports: [] };
    }
    return { template: `${indent}<${node.type} class="${className}"${attrs} />`, iconImports: [] };
  }

  const attrs = renderCommonAttrs(node, ['label', 'text']);
  const slotText = typeof node.props?.label === 'string' ? node.props.label : (typeof node.props?.text === 'string' ? node.props.text : '');
  if (slotText) {
    return { template: `${indent}<${node.type} class="${className}"${attrs}>${escapeText(slotText)}</${node.type}>`, iconImports: [] };
  }
  return { template: `${indent}<${node.type} class="${className}"${attrs} />`, iconImports: [] };
}

function generateTemplate(nodes: EditorNode[]): { template: string; iconImports: string[] } {
  const rendered = nodes.map(node => renderNode(node, 2));
  return {
    template: rendered.map(r => r.template).join('\n'),
    iconImports: rendered.flatMap(r => r.iconImports),
  };
}

export function generateVueCode(nodes: EditorNode[], config: ProjectConfig): string {
  const { template, iconImports } = generateTemplate(nodes);

  const styles = nodes.map(node => {
    const className = toClassName(node.id);
    return `.${className} {\n${styleToCss(node.style)}\n}`;
  }).join('\n\n');

  const icons = Array.from(new Set(iconImports)).sort();
  const iconImportLine = icons.length ? `import { ${icons.join(', ')} } from '@element-plus/icons-vue';\n` : '';

  return `<template>
  <div class="page-container">
${template}
  </div>
</template>

<script setup lang="ts">
${iconImportLine}</script>

<style scoped>
.page-container {
  position: relative;
  width: ${config.width}px;
  height: ${config.height}px;
  background-color: ${config.backgroundColor};
  overflow: hidden;
}

${styles}
</style>
`;
}
