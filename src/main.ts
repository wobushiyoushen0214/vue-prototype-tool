import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './style.css'
import App from './App.vue'
import router from './router'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 自动注册自定义组件
const customComponents = import.meta.glob('./custom-components/**/index.vue', { eager: true });
for (const path in customComponents) {
  const componentConfig = customComponents[path] as any;
  // 从路径中提取组件名，例如 ./custom-components/TeamCard/index.vue -> TeamCard
  const componentName = path.split('/')[2]; 
  app.component(`Custom${componentName}`, componentConfig.default || componentConfig);
}

app.mount('#app')
