export interface PropMeta {
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'icon' | 'array';
  options?: { label: string; value: any }[]; // 用于 select 类型
  step?: number; // 用于 number 类型
  min?: number;
  max?: number;
  itemType?: 'string' | 'object'; // For array type
  properties?: Record<string, PropMeta>; // For array of objects
}

export interface ComponentSchema {
  type: string;
  label: string;
  icon?: string;
  defaultProps: Record<string, any>;
  propsMeta?: Record<string, PropMeta>;
  defaultStyle: Record<string, any>;
  category: 'basic' | 'layout' | 'form' | 'data' | 'navigation' | 'feedback' | 'custom' | 'team';
  span?: number; // 侧边栏展示跨列数，默认为 1
}

export interface EditorNode {
  id: string;
  type: string;
  label: string;
  props: Record<string, any>;
  style: Record<string, any>; // CSS Properties
  children?: EditorNode[];
  parentId?: string;
  locked?: boolean;
  hidden?: boolean;
}

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'font-size' | 'spacing' | 'border-radius';
}

export interface ProjectConfig {
  width: number;
  height: number;
  backgroundColor: string;
  tokens: DesignToken[];
  lockSize?: boolean; // 锁定宽高
}

export interface Scene {
  id: string;
  name: string;
  nodes: EditorNode[];
  config: ProjectConfig;
  annotations: Annotation[];
  guides?: {
    vertical: number[];
    horizontal: number[];
  };
  x?: number; // 画布在工作区的 X 坐标
  y?: number; // 画布在工作区的 Y 坐标
}

export interface Project {
  id: string;
  name: string;
  scenes: Scene[];
  currentSceneId: string;
  thumbnail?: string;
  updatedAt: number;
}

export type EditorMode = 'edit' | 'preview';

export interface Annotation {
  id: string;
  x: number;
  y: number;
  content: string;
  createdAt: number;
  author?: string;
}
