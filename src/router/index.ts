import { createRouter, createWebHistory } from 'vue-router';
import ProjectList from '@/views/ProjectList.vue';
import EditorLayout from '@/views/EditorLayout.vue';

const routes = [
  {
    path: '/',
    name: 'ProjectList',
    component: ProjectList,
  },
  {
    path: '/editor/:id',
    name: 'Editor',
    component: EditorLayout,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
