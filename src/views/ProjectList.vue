<template>
  <div class="project-list-container">
    <div class="list-header">
      <div class="header-content">
        <h1 class="title">我的项目</h1>
        <el-button type="primary" :icon="Plus" @click="handleCreateProject">新建项目</el-button>
      </div>
    </div>

    <div class="list-body">
      <div v-if="store.projects.length === 0" class="empty-state">
        <el-empty description="暂无项目，快去创建一个吧">
          <el-button type="primary" @click="handleCreateProject">立即创建</el-button>
        </el-empty>
      </div>

      <div v-else class="project-grid">
        <div 
            v-for="project in store.projects" 
            :key="project.id" 
            class="project-card"
            @click="handleOpenProject(project.id)"
          >
          <div class="project-thumbnail">
            <img v-if="project.thumbnail" :src="project.thumbnail" alt="thumbnail" />
            <div v-else class="thumbnail-placeholder">
              <el-icon><Picture /></el-icon>
            </div>
            <div class="project-actions" @click.stop>
              <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, project)">
                <el-icon class="more-icon"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="delete" type="danger">删除项目</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div class="project-info">
            <div class="project-name">{{ project.name }}</div>
            <div class="project-meta">
              <span>{{ project.scenes.length }} 个画布</span>
              <span class="dot">·</span>
              <span>{{ formatTime(project.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEditorStore } from '@/store/editor';
import { Plus, Picture, MoreFilled } from '@element-plus/icons-vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const store = useEditorStore();
const router = useRouter();

onMounted(() => {
  store.initProjects();
});

const handleCreateProject = () => {
  ElMessageBox.prompt('请输入项目名称', '新建项目', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: '我的新项目',
  }).then(({ value }) => {
    const name = value?.trim() || '未命名项目';
    const id = store.createProject(name);
    router.push(`/editor/${id}`);
  }).catch(() => {
    // 用户取消或点击 X
  });
};

const handleOpenProject = (id: string) => {
  router.push(`/editor/${id}`);
};

const handleCommand = (cmd: string, project: any) => {
  if (cmd === 'rename') {
    ElMessageBox.prompt('请输入项目名称', '重命名项目', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: project.name,
    }).then(({ value }) => {
      if (value.trim()) {
        store.renameProject(project.id, value.trim());
        ElMessage.success('重命名成功');
      }
    }).catch(() => {});
  } else if (cmd === 'delete') {
    ElMessageBox.confirm('确定要删除该项目吗？此操作不可撤销。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      store.deleteProject(project.id);
      ElMessage.success('项目已删除');
    }).catch(() => {});
  }
};

const formatTime = (timestamp: number) => {
  return dayjs(timestamp).fromNow();
};
</script>

<style scoped>
.project-list-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  overflow: hidden;
}

.list-header {
  height: 64px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 40px;
  flex-shrink: 0;
}

.header-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.list-body {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
}

.project-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}

.project-card {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #e4e7ed;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.1);
  border-color: var(--el-color-primary-light-5);
}

.project-thumbnail {
  height: 160px;
  background-color: #f0f2f5;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  font-size: 48px;
  color: #c0c4cc;
}

.project-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.project-card:hover .project-actions {
  opacity: 1;
}

.more-icon {
  background: rgba(255, 255, 255, 0.9);
  padding: 4px;
  border-radius: 4px;
  color: #606266;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.project-info {
  padding: 16px;
}

.project-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-meta {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
}

.dot {
  margin: 0 4px;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
