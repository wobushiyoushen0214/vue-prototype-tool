import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash-es';
import type { EditorNode, ComponentSchema, ProjectConfig, EditorMode, Annotation } from '@/types/editor';

const parseValue = (val: string | number) => {
  if (typeof val === 'number') return val;
  return parseFloat(val) || 0;
};

export const useEditorStore = defineStore('editor', {
  state: () => ({
    nodes: [] as EditorNode[],
    selectedNodeIds: [] as string[],
    config: {
      width: 1920,
      height: 1080,
      backgroundColor: '#ffffff',
      tokens: [],
    } as ProjectConfig,
    history: [] as { nodes: EditorNode[], config: ProjectConfig }[],
    historyIndex: -1,
    isBatching: false, // 是否正在进行批量更新，避免重复记录历史
    draggedComponent: null as ComponentSchema | null, // 正在从侧边栏拖拽的组件
    zoom: 0.6, // 画布缩放比例
    offset: { x: 0, y: 0 }, // 画布偏移量
    clipboard: [] as EditorNode[], // 剪贴板
    mode: 'edit' as EditorMode, // 编辑/预览模式
    annotations: [] as Annotation[], // 标注
  }),

  getters: {
    treeNodes: (state) => {
      const nodeMap = new Map<string, EditorNode>();
      const rootNodes: EditorNode[] = [];
      
      // 1. Create a map of all nodes with empty children array
      state.nodes.forEach(node => {
        nodeMap.set(node.id, { ...cloneDeep(node), children: [] });
      });

      // 2. Build the tree
      nodeMap.forEach(node => {
        if (node.parentId && nodeMap.has(node.parentId)) {
          const parent = nodeMap.get(node.parentId)!;
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      });

      return rootNodes;
    },
    selectedNodes: (state) => {
      return state.nodes.filter(node => state.selectedNodeIds.includes(node.id));
    },
    // 获取第一个选中的节点，用于属性面板显示
    firstSelectedNode: (state) => {
      if (state.selectedNodeIds.length === 0) return null;
      const id = state.selectedNodeIds[0];
      return state.nodes.find(n => n.id === id) || null;
    }
  },

  actions: {
    addNode(schema: ComponentSchema, parentId?: string, position?: { x: number; y: number }) {
      const newNode: EditorNode = {
        id: uuidv4(),
        type: schema.type,
        label: schema.label,
        props: cloneDeep(schema.defaultProps),
        style: cloneDeep(schema.defaultStyle),
      };

      if (parentId) {
        newNode.parentId = parentId;
      }

      if (position) {
        newNode.style.position = 'absolute';
        newNode.style.left = `${position.x}px`;
        newNode.style.top = `${position.y}px`;
      }

      this.nodes.push(newNode);
      this.selectNode(newNode.id);
      if (!newNode.parentId) {
        this.expandCanvasIfNeeded(newNode);
      }
      this.saveHistory();
    },

    selectNode(id: string, multi = false) {
      if (multi) {
        if (this.selectedNodeIds.includes(id)) {
          this.selectedNodeIds = this.selectedNodeIds.filter(i => i !== id);
        } else {
          this.selectedNodeIds.push(id);
        }
      } else {
        this.selectedNodeIds = [id];
      }
    },

    clearSelection() {
      this.selectedNodeIds = [];
    },

    updateNodeStyle(id: string, style: Record<string, any>, skipHistory = false) {
      const node = this.nodes.find(n => n.id === id);
      if (node) {
        node.style = { ...node.style, ...style };
        if (!skipHistory && !this.isBatching) {
          this.saveHistory();
        }
      }
    },
    
    checkAndExpandCanvas(rect: { left: number; top: number; right: number; bottom: number }) {
      let newWidth = this.config.width;
      let newHeight = this.config.height;
      let shiftX = 0;
      let shiftY = 0;
      let changed = false;

      // 缓冲空间
      const buffer = 200;

      // 向右扩展
      if (rect.right > this.config.width - 50) {
        newWidth = Math.max(this.config.width, rect.right + buffer);
        changed = true;
      }
      
      // 向下扩展
      if (rect.bottom > this.config.height - 50) {
        newHeight = Math.max(this.config.height, rect.bottom + buffer);
        changed = true;
      }

      // 向左扩展 (需要平移所有节点)
      if (rect.left < 50) {
        const delta = 50 - rect.left + buffer; // 确保至少有 buffer 距离
        newWidth += delta;
        shiftX = delta;
        changed = true;
      }

      // 向上扩展 (需要平移所有节点)
      if (rect.top < 50) {
        const delta = 50 - rect.top + buffer;
        newHeight += delta;
        shiftY = delta;
        changed = true;
      }
      
      if (changed) {
        this.updateConfig({ width: newWidth, height: newHeight });
        
        // 如果有负向扩展，需要平移所有节点以保持相对位置
        if (shiftX > 0 || shiftY > 0) {
          this.nodes.forEach(node => {
            if (node.parentId) return;
            node.style.left = `${parseValue(node.style.left) + shiftX}px`;
            node.style.top = `${parseValue(node.style.top) + shiftY}px`;
          });
          
          // 同时调整视口偏移，以保持视觉平稳 (反向平移)
          // 注意：这可能导致视觉跳动，取决于是否在拖拽中。
          // 如果是在拖拽中，Moveable 会继续更新绝对坐标，可能会有冲突。
          // 更好的体验是：让用户感觉画布在“生长”，而内容不动。
          // 内容相对于视口不动，但相对于画布(0,0)变了。
          // 所以我们需要调整 offset 让视觉位置不变。
          this.offset.x -= shiftX * this.zoom;
          this.offset.y -= shiftY * this.zoom;
        }
      }
    },

    expandCanvasIfNeeded(node: EditorNode) {
       const left = parseValue(node.style.left);
       const top = parseValue(node.style.top);
       const right = left + parseValue(node.style.width);
       const bottom = top + parseValue(node.style.height);
       this.checkAndExpandCanvas({ left, top, right, bottom });
    },
    
    updateNodeProps(id: string, props: Record<string, any>) {
      const node = this.nodes.find(n => n.id === id);
      if (node) {
        node.props = { ...node.props, ...props };
        this.saveHistory();
      }
    },

    updateNodeLabel(id: string, label: string) {
      const node = this.nodes.find(n => n.id === id);
      if (!node) return;
      node.label = label;
      this.saveHistory();
    },

    toggleNodeLocked(id: string) {
      const node = this.nodes.find(n => n.id === id);
      if (!node) return;
      node.locked = !node.locked;
      this.saveHistory();
    },

    moveNodeToTarget(id: string, targetId: string) {
      if (id === targetId) return;
      const fromIndex = this.nodes.findIndex(n => n.id === id);
      const toIndex = this.nodes.findIndex(n => n.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;

      const [moved] = this.nodes.splice(fromIndex, 1);
      if (!moved) return;

      const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      this.nodes.splice(insertIndex, 0, moved);
      this.saveHistory();
    },

    moveNodeToParent(id: string, newParentId?: string) {
      const node = this.nodes.find(n => n.id === id);
      if (!node || node.parentId === newParentId) return;
      
      // Prevent circular reference
      if (newParentId) {
        let currentParentId: string | undefined = newParentId;
        while (currentParentId) {
          if (currentParentId === id) return; // Circular detected
          const parent = this.nodes.find(n => n.id === currentParentId);
          currentParentId = parent?.parentId;
        }
      }
      
      node.parentId = newParentId;
      this.saveHistory();
    },
    
    updateConfig(config: Partial<ProjectConfig>) {
      this.config = { ...this.config, ...config };
    },

    deleteSelectedNodes() {
      if (this.selectedNodeIds.length === 0) return;
      const toDelete = new Set<string>();
      const addDescendants = (id: string) => {
        if (toDelete.has(id)) return;
        toDelete.add(id);
        this.nodes.forEach(n => {
          if (n.parentId === id) addDescendants(n.id);
        });
      };
      this.selectedNodeIds.forEach(addDescendants);
      this.nodes = this.nodes.filter(n => !toDelete.has(n.id));
      this.clearSelection();
      this.saveHistory();
    },

    newProject(nextConfig?: Partial<ProjectConfig>) {
      this.nodes = [];
      this.selectedNodeIds = [];
      this.annotations = [];
      this.draggedComponent = null;
      this.clipboard = [];
      this.mode = 'edit';
      this.zoom = 0.6;
      this.offset = { x: 0, y: 0 };
      this.history = [];
      this.historyIndex = -1;
      this.config = {
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        tokens: [],
        ...cloneDeep(nextConfig || {}),
      } as ProjectConfig;
      this.saveHistory();
    },
    
    alignSelectedNodes(type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
      const selected = this.selectedNodes;
      if (selected.length < 2) return;
      
      let targetValue = 0;
      
      switch (type) {
        case 'left':
          targetValue = Math.min(...selected.map(n => parseValue(n.style.left)));
          selected.forEach(n => n.style.left = `${targetValue}px`);
          break;
        case 'right':
           // 对齐到最右侧元素的右边缘
           const maxRight = Math.max(...selected.map(n => parseValue(n.style.left) + parseValue(n.style.width)));
           selected.forEach(n => n.style.left = `${maxRight - parseValue(n.style.width)}px`);
           break;
        case 'top':
          targetValue = Math.min(...selected.map(n => parseValue(n.style.top)));
          selected.forEach(n => n.style.top = `${targetValue}px`);
          break;
        case 'bottom':
          const maxBottom = Math.max(...selected.map(n => parseValue(n.style.top) + parseValue(n.style.height)));
          selected.forEach(n => n.style.top = `${maxBottom - parseValue(n.style.height)}px`);
          break;
        case 'center': // 水平居中
           // 计算所有元素的中心点平均值，或者以最左和最右的中点为准
           // 这里采用：以包围盒的中点为准
           const minLeft = Math.min(...selected.map(n => parseValue(n.style.left)));
           const maxRightBound = Math.max(...selected.map(n => parseValue(n.style.left) + parseValue(n.style.width)));
           const centerX = (minLeft + maxRightBound) / 2;
           selected.forEach(n => n.style.left = `${centerX - parseValue(n.style.width) / 2}px`);
           break;
        case 'middle': // 垂直居中
           const minTop = Math.min(...selected.map(n => parseValue(n.style.top)));
           const maxBottomBound = Math.max(...selected.map(n => parseValue(n.style.top) + parseValue(n.style.height)));
           const centerY = (minTop + maxBottomBound) / 2;
           selected.forEach(n => n.style.top = `${centerY - parseValue(n.style.height) / 2}px`);
           break;
      }
      this.saveHistory();
    },

    saveHistory() {
      if (this.isBatching) return;
      
      const currentState = {
        nodes: cloneDeep(this.nodes),
        config: cloneDeep(this.config)
      };

      // 如果历史记录中已经有完全相同的状态，则不记录
      if (this.historyIndex >= 0) {
        const lastState = this.history[this.historyIndex];
        if (JSON.stringify(lastState) === JSON.stringify(currentState)) {
          return;
        }
      }

      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      
      this.history.push(currentState);
      this.historyIndex++;
      
      if (this.history.length > 50) { // 增加历史记录上限到 50
        this.history.shift();
        this.historyIndex--;
      }
    },

    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        const state = this.history[this.historyIndex];
        if (state) {
          this.nodes = cloneDeep(state.nodes);
          this.config = cloneDeep(state.config);
        }
      }
    },

    redo() {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        const state = this.history[this.historyIndex];
        if (state) {
          this.nodes = cloneDeep(state.nodes);
          this.config = cloneDeep(state.config);
        }
      }
    },
    
    setDraggedComponent(component: ComponentSchema | null) {
      this.draggedComponent = component;
    },

    setZoom(zoom: number) {
      this.zoom = Math.max(0.1, Math.min(zoom, 5)); // 限制缩放范围 10% ~ 500%
    },

    setOffset(offset: { x: number; y: number }) {
      this.offset = offset;
    },

    copyNodes() {
      if (this.selectedNodeIds.length === 0) return;
      this.clipboard = cloneDeep(this.selectedNodes);
    },

    pasteNodes() {
      if (this.clipboard.length === 0) return;
      
      const newNodes = cloneDeep(this.clipboard).map(node => ({
        ...node,
        id: uuidv4(),
        style: {
          ...node.style,
          left: `${parseValue(node.style.left) + 20}px`,
          top: `${parseValue(node.style.top) + 20}px`,
        }
      }));

      this.nodes.push(...newNodes);
      this.selectedNodeIds = newNodes.map(n => n.id);
      this.saveHistory();
    },

    selectAllNodes() {
      this.selectedNodeIds = this.nodes.filter(n => !n.hidden).map(n => n.id);
    },

    duplicateSelectedNodes() {
      if (this.selectedNodeIds.length === 0) return;
      this.copyNodes();
      this.pasteNodes();
    },

    toggleSelectedLocked() {
      if (this.selectedNodeIds.length === 0) return;
      const selected = this.selectedNodes;
      if (selected.length === 0) return;
      const next = selected.some(n => !n.locked);
      selected.forEach(n => { n.locked = next; });
      this.saveHistory();
    },

    toggleSelectedHidden() {
      if (this.selectedNodeIds.length === 0) return;
      const selected = this.selectedNodes;
      if (selected.length === 0) return;
      const next = selected.some(n => !n.hidden);
      selected.forEach(n => { n.hidden = next; });
      if (next) {
        this.selectedNodeIds = [];
      }
      this.saveHistory();
    },

    nudgeSelectedNodes(dx: number, dy: number) {
      if (this.selectedNodeIds.length === 0) return;
      if (dx === 0 && dy === 0) return;

      const selected = this.selectedNodes;
      if (selected.length === 0) return;

      this.isBatching = true;
      selected.forEach(node => {
        if (node.locked) return;
        const parent = node.parentId ? this.nodes.find(n => n.id === node.parentId) : null;
        const isFlexChild = parent?.type === 'container' && parent.props?.display === 'flex';
        if (isFlexChild) return;

        const left = parseValue(node.style.left);
        const top = parseValue(node.style.top);
        this.updateNodeStyle(node.id, {
          left: `${left + dx}px`,
          top: `${top + dy}px`,
        }, true);
      });
      this.isBatching = false;
      this.saveHistory();
    },

    setBatching(isBatching: boolean) {
      this.isBatching = isBatching;
      if (!isBatching) {
        this.saveHistory();
      }
    },

    initHistory() {
      if (this.history.length === 0) {
        this.saveHistory();
      }
    },

    setMode(mode: EditorMode) {
      this.mode = mode;
      if (mode === 'preview') {
        this.clearSelection();
      }
    },

    toggleNodeHidden(id: string) {
      const node = this.nodes.find(n => n.id === id);
      if (!node) return;
      node.hidden = !node.hidden;
      if (node.hidden && this.selectedNodeIds.includes(id)) {
        this.selectedNodeIds = this.selectedNodeIds.filter(i => i !== id);
      }
      this.saveHistory();
    },

    addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt'>) {
      this.annotations.push({
        ...annotation,
        id: uuidv4(),
        createdAt: Date.now(),
      });
    },

    updateAnnotation(id: string, content: string) {
      const annotation = this.annotations.find(a => a.id === id);
      if (annotation) {
        annotation.content = content;
      }
    },

    deleteAnnotation(id: string) {
      this.annotations = this.annotations.filter(a => a.id !== id);
    },

    clearAnnotations() {
      this.annotations = [];
    },
    exportDesign() {
      const payload = {
        version: 1,
        config: cloneDeep(this.config),
        nodes: cloneDeep(this.nodes),
      };
      return JSON.stringify(payload, null, 2);
    },

    importDesign(input: string) {
      let parsed: any;
      try {
        parsed = JSON.parse(input);
      } catch {
        return false;
      }

      const nextNodes = Array.isArray(parsed) ? parsed : parsed?.nodes;
      const nextConfig = Array.isArray(parsed) ? null : parsed?.config;

      if (!Array.isArray(nextNodes)) return false;

      this.nodes = cloneDeep(nextNodes);
      if (nextConfig && typeof nextConfig === 'object') {
        this.config = {
          ...this.config,
          ...cloneDeep(nextConfig),
          tokens: Array.isArray(nextConfig.tokens) ? cloneDeep(nextConfig.tokens) : (this.config.tokens ?? []),
        };
      }

      this.selectedNodeIds = [];
      this.annotations = [];
      this.history = [];
      this.historyIndex = -1;
      this.saveHistory();
      return true;
    }
  }
});
