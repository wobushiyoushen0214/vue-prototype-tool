/*
 * @Author: LiZhiWei
 * @Date: 2026-01-09 09:13:32
 * @LastEditors: LiZhiWei
 * @LastEditTime: 2026-01-09 09:13:46
 * @Description: 
 */
import type { ProjectConfig } from '@/types/editor';

export const defaultProjectTemplate = {
  name: "空白基础项目",
  scenes: [
    {
      name: "主画布",
      nodes: [],
      config: {
        width: 750,
        height: 1334,
        backgroundColor: "#f5f7fa",
        tokens: [],
        lockSize: false
      } as ProjectConfig,
      annotations: [],
      x: 0,
      y: 0
    }
  ]
};
