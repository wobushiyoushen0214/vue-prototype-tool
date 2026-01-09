import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash-es';
import type { EditorNode, ComponentSchema, ProjectConfig, EditorMode, Annotation, Scene, Project } from '@/types/editor';
import { defaultProjectTemplate } from '../assets/templates/default-project';

const PROJECTS_STORAGE_KEY = 'vpt_projects_v3'; // 升级版本号以强制使用新模板
const CURRENT_PROJECT_ID_KEY = 'vpt_current_project_id';

const parseValue = (val: string | number) => {
  if (typeof val === 'number') return val;
  return parseFloat(val) || 0;
};

const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  width: 750,
  height: 1334,
  backgroundColor: '#f5f7fa',
  tokens: [],
  lockSize: false,
};

const getTemplateConfig = () => {
  try {
    const template = defaultProjectTemplate as any;
    if (template && template.scenes && template.scenes[0] && template.scenes[0].config) {
      return {
        ...DEFAULT_PROJECT_CONFIG,
        ...template.scenes[0].config
      };
    }
  } catch (e) {
    console.error('Failed to get template config', e);
  }
  return { ...DEFAULT_PROJECT_CONFIG };
};

const DEFAULT_CONFIG: ProjectConfig = getTemplateConfig();

// 代码层面的默认项目数据
const createDefaultProjects = (): Project[] => {
  try {
    const template = cloneDeep(defaultProjectTemplate) as any;
    
    // 映射场景，保持 JSON 中的原始配置
    const scenes: Scene[] = (template.scenes || []).map((scene: any) => ({
      ...scene,
      id: uuidv4(),
      nodes: (scene.nodes || []) as EditorNode[],
      annotations: (scene.annotations || []) as Annotation[],
      config: { ...scene.config } // 直接使用 JSON 中的 config
    }));

    // 如果 JSON 没场景，兜底创建一个
    if (scenes.length === 0) {
      scenes.push({
        id: uuidv4(),
        name: '主画布',
        nodes: [],
        config: { ...DEFAULT_CONFIG },
        annotations: [],
        x: 0,
        y: 0,
      });
    }

    const project: Project = {
      ...template, // 继承 JSON 中的所有属性（包括 name, thumbnail 等）
      id: uuidv4(),
      updatedAt: Date.now(),
      scenes: scenes,
      currentSceneId: scenes[0] ? scenes[0].id : ''
    };

    return [project];
  } catch (e) {
    console.error('Failed to create default projects from template', e);
    const firstSceneId = uuidv4();
    return [{
      id: uuidv4(),
      name: '空白基础项目',
      updatedAt: Date.now(),
      scenes: [{
        id: firstSceneId,
        name: '主画布',
        nodes: [],
        config: { ...DEFAULT_CONFIG },
        annotations: [],
        x: 0,
        y: 0,
      }],
      currentSceneId: firstSceneId,
      thumbnail: ''
    }];
  }
};

const DEFAULT_PROJECTS = createDefaultProjects();

export const useEditorStore = defineStore('editor', {
  state: () => ({
    // 项目管理
    projects: [] as Project[],
    currentProjectId: '' as string,
    
    // 当前编辑器状态
    scenes: [] as Scene[],
    currentSceneId: '' as string,
    selectedSceneIds: [] as string[],
    nodes: [] as EditorNode[],
    selectedNodeIds: [] as string[],
    config: { ...DEFAULT_CONFIG } as ProjectConfig,
    history: [] as { nodes: EditorNode[], config: ProjectConfig }[],
    historyIndex: -1,
    isBatching: false,
    draggedComponent: null as ComponentSchema | null,
    zoom: 0.5,
    offset: { x: 0, y: 0 },
    clipboard: [] as EditorNode[],
    sceneClipboard: null as Scene[] | null,
    mode: 'edit' as EditorMode,
    annotations: [] as Annotation[],
  }),

  getters: {
    currentProject: (state) => {
      return state.projects.find(p => p.id === state.currentProjectId) || null;
    },
    currentProjectName: (state) => {
      const p = state.projects.find(p => p.id === state.currentProjectId);
      return p ? p.name : '';
    },
    treeNodes: (state) => {
      const nodeMap = new Map<string, EditorNode>();
      const rootNodes: EditorNode[] = [];
      
      state.nodes.forEach(node => {
        nodeMap.set(node.id, { ...cloneDeep(node), children: [] });
      });

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
    firstSelectedNode: (state) => {
      if (state.selectedNodeIds.length === 0) return null;
      const id = state.selectedNodeIds[0];
      return state.nodes.find(n => n.id === id) || null;
    },
    getSceneTreeNodes: (state) => {
      return (nodes: EditorNode[]) => {
        const nodeMap = new Map<string, EditorNode>();
        const rootNodes: EditorNode[] = [];
        
        nodes.forEach(node => {
          nodeMap.set(node.id, { ...cloneDeep(node), children: [] });
        });

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
      };
    },
    currentScene: (state) => {
      return state.scenes.find(s => s.id === state.currentSceneId);
    }
  },

  actions: {
    // --- 项目管理 Actions ---
    initProjects() {
      const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.projects = parsed;
          } else {
            this.projects = cloneDeep(DEFAULT_PROJECTS);
          }
        } catch (e) {
          console.error('Failed to parse projects', e);
          this.projects = cloneDeep(DEFAULT_PROJECTS);
        }
      } else {
        // 如果没有缓存，优先读取代码层面的默认数据
        this.projects = cloneDeep(DEFAULT_PROJECTS);
        this.saveAllProjects();
      }

      // 恢复当前选中的项目 ID
      const savedCurrentId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
      if (savedCurrentId && this.projects.length > 0 && this.projects.some(p => p.id === savedCurrentId)) {
        this.currentProjectId = savedCurrentId;
      } else if (this.projects.length > 0) {
        const firstProject = this.projects[0];
        if (firstProject) {
          this.currentProjectId = firstProject.id;
        }
      }
    },

    saveAllProjects() {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(this.projects));
      if (this.currentProjectId) {
        localStorage.setItem(CURRENT_PROJECT_ID_KEY, this.currentProjectId);
      }
    },

    createProject(name: string = '未命名项目') {
      const template = cloneDeep(defaultProjectTemplate) as any;
      
      // 映射场景，保持 JSON 中的原始配置
      const scenes: Scene[] = (template.scenes || []).map((scene: any) => ({
        ...scene,
        id: uuidv4(),
        nodes: (scene.nodes || []) as EditorNode[],
        annotations: (scene.annotations || []) as Annotation[],
        config: { ...scene.config } // 直接使用 JSON 中的 config
      }));

      if (scenes.length === 0) {
        scenes.push({
          id: uuidv4(),
          name: '主画布',
          nodes: [],
          config: { ...DEFAULT_CONFIG },
          annotations: [],
          x: 0,
          y: 0,
        });
      }

      const firstScene = scenes[0];
      const newProjectId = uuidv4();
      const newProject: Project = {
        ...template,
        name: name || template.name || '未命名项目',
        id: newProjectId,
        updatedAt: Date.now(),
        scenes: scenes,
        currentSceneId: firstScene ? firstScene.id : ''
      };
      
      this.projects.unshift(newProject);
      
      // 核心修复：创建后立即初始化编辑器状态，确保跳转后数据已就绪
      this.resetEditorState();
      this.currentProjectId = newProjectId;
      this.scenes = cloneDeep(scenes);
      if (firstScene) {
        this.switchScene(firstScene.id);
      }
      this.saveAllProjects();
      
      return newProjectId;
    },

    openProject(id: string) {
      // 如果项目列表为空，尝试初始化
      if (this.projects.length === 0) {
        this.initProjects();
      }

      const project = this.projects.find(p => p.id === id);
      if (!project) {
        console.warn(`Project with id ${id} not found`);
        return;
      }

      this.resetEditorState(); // 加载前先重置所有编辑器状态
      this.currentProjectId = id;
      this.scenes = cloneDeep(project.scenes);
      
      // 确保每个场景都有坐标
      this.scenes.forEach((scene, index) => {
        if (scene.x === undefined) scene.x = index * (scene.config.width + 100);
        if (scene.y === undefined) scene.y = 0;
      });

      // 恢复到上次编辑的场景或第一个场景
      const targetSceneId = project.currentSceneId || (this.scenes[0]?.id || '');
      this.currentSceneId = ''; // 强制触发 switchScene 逻辑
      this.switchScene(targetSceneId);
      
      this.zoom = 0.5;
      this.offset = { x: 0, y: 0 };
    },

    resetEditorState() {
      this.currentProjectId = '';
      this.scenes = [];
      this.currentSceneId = '';
      this.selectedSceneIds = [];
      this.nodes = [];
      this.config = { ...DEFAULT_CONFIG };
      this.annotations = [];
      this.selectedNodeIds = [];
      this.history = [];
      this.historyIndex = -1;
      this.draggedComponent = null;
      this.clipboard = [];
      this.sceneClipboard = null;
      this.zoom = 0.5;
      this.offset = { x: 0, y: 0 };
    },

    deleteProject(id: string) {
      const index = this.projects.findIndex(p => p.id === id);
      if (index !== -1) {
        this.projects.splice(index, 1);
        if (this.currentProjectId === id) {
          this.currentProjectId = '';
        }
        this.saveAllProjects();
      }
    },

    renameProject(id: string, name: string) {
      const project = this.projects.find(p => p.id === id);
      if (project) {
        project.name = name;
        this.saveAllProjects();
      }
    },

    updateProjectThumbnail(id: string, thumbnail: string) {
      const project = this.projects.find(p => p.id === id);
      if (project) {
        project.thumbnail = thumbnail;
        this.saveAllProjects();
      }
    },

    goBackToList() {
      this.syncCurrentProject();
      this.currentProjectId = '';
    },

    syncCurrentProject() {
      if (!this.currentProjectId) return;
      const project = this.projects.find(p => p.id === this.currentProjectId);
      if (!project) return;

      this.syncCurrentScene();
      project.scenes = cloneDeep(this.scenes);
      project.currentSceneId = this.currentSceneId;
      project.updatedAt = Date.now();
      this.saveAllProjects();
    },

    // --- 画布 (原场景) 管理 Actions ---
    addScene(name?: string, config?: ProjectConfig, position?: { x: number, y: number }) {
      this.syncCurrentScene();

      // 计算新画布位置
      const lastScene = this.scenes[this.scenes.length - 1];
      let newX = position ? position.x : (lastScene ? (lastScene.x || 0) + (lastScene.config.width + 100) : 0);
      let newY = position ? position.y : 0;

      const newScene: Scene = {
        id: uuidv4(),
        name: name || `画布 ${this.scenes.length + 1}`,
        nodes: [],
        config: config ? cloneDeep(config) : { ...DEFAULT_CONFIG },
        annotations: [],
        x: newX,
        y: newY,
      };
      this.scenes.push(newScene);
      this.switchScene(newScene.id);
    },

    copyScene(sceneId: string) {
      this.syncCurrentScene();
      const scene = this.scenes.find(s => s.id === sceneId);
      if (!scene) return;

      const newSceneId = uuidv4();
      
      // 深度克隆节点并更新 ID 的辅助函数
      const cloneNodesWithNewIds = (nodes: EditorNode[], parentId?: string): EditorNode[] => {
        return nodes.map(node => {
          const newNodeId = uuidv4();
          const newNode: EditorNode = {
            ...cloneDeep(node),
            id: newNodeId,
            parentId: parentId || node.parentId
          };
          if (node.children && node.children.length > 0) {
            newNode.children = cloneNodesWithNewIds(node.children, newNodeId);
          }
          return newNode;
        });
      };

      const newScene: Scene = {
        ...cloneDeep(scene),
        id: newSceneId,
        name: `${scene.name} (副本)`,
        x: (scene.x || 0) + (scene.config.width + 100),
        y: scene.y || 0,
        nodes: cloneNodesWithNewIds(scene.nodes)
      };

      // 更新平铺数组中的 parentId 引用关系
      const idMap = new Map<string, string>();
      const buildIdMap = (oldNodes: EditorNode[], newNodes: EditorNode[]) => {
        oldNodes.forEach((oldNode, index) => {
          const newNode = newNodes[index];
          if (newNode) {
            idMap.set(oldNode.id, newNode.id);
            if (oldNode.children && newNode.children) {
              buildIdMap(oldNode.children, newNode.children);
            }
          }
        });
      };
      buildIdMap(scene.nodes, newScene.nodes);

      const updateRefs = (nodes: EditorNode[]) => {
        nodes.forEach(node => {
          if (node.parentId && idMap.has(node.parentId)) {
            node.parentId = idMap.get(node.parentId);
          }
          if (node.children) updateRefs(node.children);
        });
      };
      updateRefs(newScene.nodes);

      this.scenes.push(newScene);
      this.switchScene(newSceneId);
    },

    copySelectedScenesToClipboard() {
      if (this.selectedSceneIds.length === 0) return;
      const selectedScenes = this.scenes.filter(s => this.selectedSceneIds.includes(s.id));
      this.sceneClipboard = cloneDeep(selectedScenes);
    },

    pasteSceneFromClipboard(position?: { x: number, y: number }) {
      if (!this.sceneClipboard || this.sceneClipboard.length === 0) return;
      
      const clipboard = this.sceneClipboard;
      const firstScene = clipboard[0];
      if (!firstScene) return;

      const newScenes: Scene[] = [];
      const offsetX = position ? position.x - (firstScene.x || 0) : 50;
      const offsetY = position ? position.y - (firstScene.y || 0) : 50;

      clipboard.forEach(scene => {
        const newSceneId = uuidv4();
        
        // 深度克隆节点并更新 ID 的辅助函数
        const cloneNodesWithNewIds = (nodes: EditorNode[], parentId?: string): EditorNode[] => {
          return nodes.map(node => {
            const newNodeId = uuidv4();
            const newNode: EditorNode = {
              ...cloneDeep(node),
              id: newNodeId,
              parentId: parentId || node.parentId
            };
            if (node.children && node.children.length > 0) {
              newNode.children = cloneNodesWithNewIds(node.children, newNodeId);
            }
            return newNode;
          });
        };

        const newScene: Scene = {
          ...cloneDeep(scene),
          id: newSceneId,
          name: `${scene.name} (粘贴)`,
          x: (scene.x || 0) + offsetX,
          y: (scene.y || 0) + offsetY,
          nodes: cloneNodesWithNewIds(scene.nodes)
        };

        // 更新引用关系
        const idMap = new Map<string, string>();
        const buildIdMap = (oldNodes: EditorNode[], newNodes: EditorNode[]) => {
          oldNodes.forEach((oldNode, index) => {
            const newNode = newNodes[index];
            if (newNode) {
              idMap.set(oldNode.id, newNode.id);
              if (oldNode.children && newNode.children) {
                buildIdMap(oldNode.children, newNode.children);
              }
            }
          });
        };
        buildIdMap(scene.nodes, newScene.nodes);

        const updateRefs = (nodes: EditorNode[]) => {
          nodes.forEach(node => {
            if (node.parentId && idMap.has(node.parentId)) {
              node.parentId = idMap.get(node.parentId) || node.parentId;
            }
            if (node.children) updateRefs(node.children);
          });
        };
        updateRefs(newScene.nodes);
        
        newScenes.push(newScene);
      });

      this.scenes.push(...newScenes);
      this.selectedSceneIds = newScenes.map(s => s.id);
      const firstNewScene = newScenes[0];
      if (firstNewScene) {
        this.switchScene(firstNewScene.id);
      }
      this.saveHistory();
    },

    updateScenePosition(sceneId: string, x: number, y: number) {
      const scene = this.scenes.find(s => s.id === sceneId);
      if (scene) {
        scene.x = x;
        scene.y = y;
      }
    },

    updateSelectedScenesConfig(config: Partial<ProjectConfig>) {
      if (this.selectedSceneIds.length === 0) return;
      this.selectedSceneIds.forEach(id => {
        const scene = this.scenes.find(s => s.id === id);
        if (scene) {
          scene.config = { ...scene.config, ...config };
        }
      });
    },

    updateSelectedScenesPosition(dx: number, dy: number) {
      this.selectedSceneIds.forEach(id => {
        const scene = this.scenes.find(s => s.id === id);
        if (scene) {
          scene.x = (scene.x || 0) + dx;
          scene.y = (scene.y || 0) + dy;
        }
      });
    },

    selectScene(sceneId: string, multi: boolean = false) {
      if (!multi) {
        this.selectedSceneIds = [sceneId];
      } else if (!this.selectedSceneIds.includes(sceneId)) {
        this.selectedSceneIds.push(sceneId);
      }
      this.currentSceneId = sceneId;
    },

    clearSceneSelection() {
      this.selectedSceneIds = [];
    },

    toggleSceneLock(sceneId: string) {
      const scene = this.scenes.find(s => s.id === sceneId);
      if (scene) {
        scene.config.lockSize = !scene.config.lockSize;
        if (scene.id === this.currentSceneId) {
          this.config.lockSize = scene.config.lockSize;
        }
      }
    },

    switchScene(id: string) {
      if (this.currentSceneId === id && this.nodes.length > 0) return;

      this.syncCurrentScene();

      const scene = this.scenes.find(s => s.id === id);
      if (scene) {
        this.currentSceneId = id;
        this.nodes = cloneDeep(scene.nodes);
        this.config = cloneDeep(scene.config);
        this.annotations = cloneDeep(scene.annotations || []);
        this.selectedNodeIds = [];
        
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();
      }
    },

    syncCurrentScene() {
      const currentScene = this.scenes.find(s => s.id === this.currentSceneId);
      if (currentScene) {
        currentScene.nodes = cloneDeep(this.nodes);
        currentScene.config = cloneDeep(this.config);
        currentScene.annotations = cloneDeep(this.annotations);
      }
    },

    deleteScene(id: string) {
      if (this.scenes.length <= 1) return;

      const index = this.scenes.findIndex(s => s.id === id);
      if (index === -1) return;

      this.scenes.splice(index, 1);
      
      if (this.currentSceneId === id) {
        const nextIndex = Math.min(index, this.scenes.length - 1);
        const nextScene = this.scenes[nextIndex];
        if (nextScene) {
          this.switchScene(nextScene.id);
        }
      }
    },

    renameScene(id: string, name: string) {
      const scene = this.scenes.find(s => s.id === id);
      if (scene) {
        scene.name = name;
      }
    },

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
      if (this.config.lockSize) return;

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

    cutNodes() {
      if (this.selectedNodeIds.length === 0) return;
      this.copyNodes();
      this.deleteSelectedNodes();
    },

    pasteNodes() {
      if (!this.clipboard || this.clipboard.length === 0) return;
      
      const idMap = new Map<string, string>();
      this.clipboard.forEach(node => {
        idMap.set(node.id, uuidv4());
      });

      const newNodes = this.clipboard.map(node => {
        const newNode = cloneDeep(node);
        newNode.id = idMap.get(node.id)!;
        if (node.parentId && idMap.has(node.parentId)) {
          newNode.parentId = idMap.get(node.parentId);
        }
        
        newNode.style = {
          ...newNode.style,
          left: `${parseValue(newNode.style.left) + 20}px`,
          top: `${parseValue(newNode.style.top) + 20}px`,
        };
        return newNode;
      });

      this.nodes.push(...newNodes);
      this.selectedNodeIds = newNodes.map(n => n.id);
      this.saveHistory();
    },

    // --- 层级操作 ---
    bringToFront() {
      if (this.selectedNodeIds.length === 0) return;
      // 在当前 nodes 数组中移动。
      // 先取出选中的，再把剩下的过滤出来，最后把选中的放后面
      const selected = this.nodes.filter(n => this.selectedNodeIds.includes(n.id));
      const remaining = this.nodes.filter(n => !this.selectedNodeIds.includes(n.id));
      this.nodes = [...remaining, ...selected];
      this.saveHistory();
    },

    sendToBack() {
      if (this.selectedNodeIds.length === 0) return;
      const selected = this.nodes.filter(n => this.selectedNodeIds.includes(n.id));
      const remaining = this.nodes.filter(n => !this.selectedNodeIds.includes(n.id));
      this.nodes = [...selected, ...remaining];
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
      // 初始化第一个场景（如果没有）
      if (this.scenes.length === 0) {
        const firstScene: Scene = {
          id: uuidv4(),
          name: '场景 1',
          nodes: cloneDeep(this.nodes),
          config: cloneDeep(this.config),
          annotations: cloneDeep(this.annotations),
        };
        this.scenes.push(firstScene);
        this.currentSceneId = firstScene.id;
      }

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
      this.syncCurrentScene();
      const payload = {
        version: 2,
        scenes: cloneDeep(this.scenes),
        currentSceneId: this.currentSceneId,
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

      // 处理多场景导入 (v2)
      if (parsed?.version === 2 && Array.isArray(parsed.scenes)) {
        this.scenes = cloneDeep(parsed.scenes);
        const targetId = parsed.currentSceneId || this.scenes[0]?.id;
        
        // 切换到目标场景
        const scene = this.scenes.find(s => s.id === targetId) || this.scenes[0];
        if (scene) {
          this.currentSceneId = scene.id;
          this.nodes = cloneDeep(scene.nodes);
          this.config = cloneDeep(scene.config);
          this.annotations = cloneDeep(scene.annotations || []);
        }
        this.selectedNodeIds = [];
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();
        return true;
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

      // 同时也创建一个场景
      const sceneId = uuidv4();
      this.scenes = [{
        id: sceneId,
        name: '场景 1',
        nodes: cloneDeep(this.nodes),
        config: cloneDeep(this.config),
        annotations: cloneDeep(this.annotations || []),
      }];
      this.currentSceneId = sceneId;

      this.selectedNodeIds = [];
      this.annotations = [];
      this.history = [];
      this.historyIndex = -1;
      this.saveHistory();
      return true;
    }
  }
});
