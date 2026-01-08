import type { ComponentSchema } from '@/types/editor';

export const elementPlusComponents: Record<string, ComponentSchema[]> = {
  'layout': [
    {
      type: 'container',
      label: '容器',
      category: 'layout',
      defaultProps: {},
      propsMeta: {
        display: {
          label: '布局模式',
          type: 'select',
          options: [
            { label: '绝对定位', value: 'block' },
            { label: '弹性布局 (Flex)', value: 'flex' }
          ]
        },
        flexDirection: {
          label: '排列方向',
          type: 'select',
          options: [
            { label: '水平 (Row)', value: 'row' },
            { label: '垂直 (Column)', value: 'column' }
          ]
        },
        justifyContent: {
          label: '主轴对齐',
          type: 'select',
          options: [
            { label: '起点 (Start)', value: 'flex-start' },
            { label: '居中 (Center)', value: 'center' },
            { label: '终点 (End)', value: 'flex-end' },
            { label: '两端对齐 (Between)', value: 'space-between' },
            { label: '平均分布 (Around)', value: 'space-around' }
          ]
        },
        alignItems: {
          label: '交叉轴对齐',
          type: 'select',
          options: [
            { label: '起点 (Start)', value: 'flex-start' },
            { label: '居中 (Center)', value: 'center' },
            { label: '终点 (End)', value: 'flex-end' },
            { label: '拉伸 (Stretch)', value: 'stretch' }
          ]
        },
        gap: { label: '间距 (px)', type: 'number', step: 1, min: 0 }
      },
      defaultStyle: {
        width: '200px',
        height: '200px',
        backgroundColor: '#ffffff',
        border: '1px solid #dcdfe6',
        display: 'block',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: '0px'
      }
    }
  ],
  'basic': [
    {
      type: 'el-button',
      label: '按钮',
      category: 'basic',
      defaultProps: { type: 'primary', plain: false, round: false, circle: false, disabled: false, text: false, size: 'default', loading: false, label: '按钮' },
      propsMeta: {
        label: { label: '文本内容', type: 'string' },
        type: { 
          label: '类型', 
          type: 'select', 
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Danger', value: 'danger' },
            { label: 'Info', value: 'info' },
            { label: 'Default', value: '' }
          ] 
        },
        size: {
          label: '尺寸',
          type: 'select',
          options: [
            { label: 'Large', value: 'large' },
            { label: 'Default', value: 'default' },
            { label: 'Small', value: 'small' }
          ]
        },
        plain: { label: '朴素按钮', type: 'boolean' },
        round: { label: '圆角按钮', type: 'boolean' },
        circle: { label: '圆形按钮', type: 'boolean' },
        disabled: { label: '禁用', type: 'boolean' },
        loading: { label: '加载中', type: 'boolean' }
      },
      defaultStyle: { width: '80px', height: '32px' }
    },
    {
      type: 'el-link',
      label: '链接',
      category: 'basic',
      defaultProps: { type: 'primary', underline: true, disabled: false, href: '', label: '链接' },
      propsMeta: {
        label: { label: '链接文本', type: 'string' },
        href: { label: '跳转链接', type: 'string' },
        type: { 
          label: '类型', 
          type: 'select', 
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Danger', value: 'danger' },
            { label: 'Info', value: 'info' },
            { label: 'Default', value: 'default' }
          ] 
        },
        underline: { label: '下划线', type: 'boolean' },
        disabled: { label: '禁用', type: 'boolean' }
      },
      defaultStyle: { width: 'auto', height: 'auto', fontSize: '14px' }
    },
    {
      type: 'el-text',
      label: '文本',
      category: 'basic',
      defaultProps: { type: '', size: 'default', truncated: false, tag: 'span', label: '普通文本' },
      propsMeta: {
        label: { label: '文本内容', type: 'string' },
        type: { 
          label: '类型', 
          type: 'select', 
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Danger', value: 'danger' },
            { label: 'Info', value: 'info' },
            { label: 'Default', value: '' }
          ] 
        },
        size: {
          label: '尺寸',
          type: 'select',
          options: [
            { label: 'Large', value: 'large' },
            { label: 'Default', value: 'default' },
            { label: 'Small', value: 'small' }
          ]
        },
        truncated: { label: '省略号', type: 'boolean' }
      },
      defaultStyle: { width: 'auto', height: 'auto', fontSize: '14px' }
    },
    {
        type: 'el-icon',
        label: '图标',
        category: 'basic',
        defaultProps: { size: 20, color: '#409eff', name: 'Edit' },
        propsMeta: {
          name: { label: '图标名称', type: 'string' }, // Ideally this should be an icon picker
          size: { label: '尺寸', type: 'number' },
          color: { label: '颜色', type: 'color' }
        },
        defaultStyle: { width: '20px', height: '20px' }
    }
  ],
  'form': [
    {
      type: 'el-input',
      label: '输入框',
      category: 'form',
      defaultProps: { placeholder: '请输入内容', clearable: true, disabled: false, type: 'text', modelValue: '' },
      propsMeta: {
        modelValue: { label: '绑定值', type: 'string' },
        placeholder: { label: '占位文本', type: 'string' },
        type: {
          label: '类型',
          type: 'select',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Password', value: 'password' },
            { label: 'Textarea', value: 'textarea' }
          ]
        },
        clearable: { label: '可清空', type: 'boolean' },
        disabled: { label: '禁用', type: 'boolean' }
      },
      defaultStyle: { width: '180px', height: '32px' },
      span: 2
    },
    {
      type: 'el-input-number',
      label: '数字输入',
      category: 'form',
      defaultProps: { min: 0, max: 100, controls: true, modelValue: 0 },
      propsMeta: {
        modelValue: { label: '默认值', type: 'number' },
        min: { label: '最小值', type: 'number' },
        max: { label: '最大值', type: 'number' },
        controls: { label: '控制按钮', type: 'boolean' }
      },
      defaultStyle: { width: '150px', height: '32px' },
      span: 2
    },
    {
      type: 'el-select',
      label: '选择器',
      category: 'form',
      defaultProps: { placeholder: '请选择', clearable: true, modelValue: '' },
      propsMeta: {
        modelValue: { label: '绑定值', type: 'string' },
        placeholder: { label: '占位文本', type: 'string' },
        clearable: { label: '可清空', type: 'boolean' },
        options: {
          label: '选项列表',
          type: 'array',
          itemType: 'object',
          properties: {
            label: { label: '名称', type: 'string' },
            value: { label: '值', type: 'string' }
          }
        }
      },
      defaultStyle: { width: '180px', height: '32px' },
      span: 2
    },
    {
      type: 'el-switch',
      label: '开关',
      category: 'form',
      defaultProps: { modelValue: false, activeText: '开启', inactiveText: '关闭', disabled: false },
      propsMeta: {
        modelValue: { label: '绑定值', type: 'boolean' },
        activeText: { label: '开启文案', type: 'string' },
        inactiveText: { label: '关闭文案', type: 'string' },
        disabled: { label: '禁用', type: 'boolean' }
      },
      defaultStyle: { width: 'auto', height: 'auto' }
    },
    {
      type: 'el-radio-group',
      label: '单选框',
      category: 'form',
      defaultProps: { modelValue: '1', options: [{label: '选项1', value: '1'}, {label: '选项2', value: '2'}] },
      propsMeta: {
        modelValue: { label: '选中值', type: 'string' },
        options: {
          label: '选项列表',
          type: 'array',
          itemType: 'object',
          properties: {
            label: { label: '名称', type: 'string' },
            value: { label: '值', type: 'string' }
          }
        }
      },
      defaultStyle: { width: 'auto', height: 'auto' },
      span: 2
    },
    {
      type: 'el-checkbox-group',
      label: '多选框',
      category: 'form',
      defaultProps: { modelValue: [], options: [{label: '选项1', value: '1'}, {label: '选项2', value: '2'}] },
      propsMeta: {
        modelValue: { label: '选中值', type: 'array', itemType: 'string' },
        options: {
          label: '选项列表',
          type: 'array',
          itemType: 'object',
          properties: {
            label: { label: '名称', type: 'string' },
            value: { label: '值', type: 'string' }
          }
        }
      },
      defaultStyle: { width: 'auto', height: 'auto' },
      span: 2
    },
    {
      type: 'el-slider',
      label: '滑块',
      category: 'form',
      defaultProps: { modelValue: 30, showTooltip: true, min: 0, max: 100, step: 1, disabled: false },
      propsMeta: {
        modelValue: { label: '当前值', type: 'number' },
        min: { label: '最小值', type: 'number' },
        max: { label: '最大值', type: 'number' },
        step: { label: '步长', type: 'number' },
        showTooltip: { label: '显示提示', type: 'boolean' },
        disabled: { label: '禁用', type: 'boolean' }
      },
      defaultStyle: { width: '300px', height: 'auto', padding: '0 20px' },
      span: 2
    },
    {
      type: 'el-time-picker',
      label: '时间选择',
      category: 'form',
      defaultProps: { placeholder: '选择时间', modelValue: '', format: 'HH:mm:ss' },
      propsMeta: {
        modelValue: { label: '绑定值', type: 'string' },
        placeholder: { label: '占位文本', type: 'string' },
        format: { label: '格式', type: 'string' }
      },
      defaultStyle: { width: '180px', height: '32px' },
      span: 2
    },
    {
      type: 'el-date-picker',
      label: '日期选择',
      category: 'form',
      defaultProps: { type: 'date', placeholder: '选择日期', modelValue: '', format: 'YYYY-MM-DD' },
      propsMeta: {
        modelValue: { label: '绑定值', type: 'string' },
        placeholder: { label: '占位文本', type: 'string' },
        type: { 
            label: '类型', 
            type: 'select',
            options: [
                { label: 'Date', value: 'date' },
                { label: 'Week', value: 'week' },
                { label: 'Month', value: 'month' },
                { label: 'Year', value: 'year' },
                { label: 'Datetime', value: 'datetime' }
            ]
        },
        format: { label: '格式', type: 'string' }
      },
      defaultStyle: { width: '180px', height: '32px' },
      span: 2
    },
    {
        type: 'el-rate',
        label: '评分',
        category: 'form',
        defaultProps: { modelValue: 3.5, allowHalf: true, max: 5 },
        propsMeta: {
            modelValue: { label: '评分', type: 'number' },
            allowHalf: { label: '允许半选', type: 'boolean' },
            max: { label: '最大分', type: 'number' }
        },
        defaultStyle: { width: 'auto', height: 'auto' }
    },
    {
        type: 'el-color-picker',
        label: '颜色选择',
        category: 'form',
        defaultProps: { modelValue: '#409eff', showAlpha: false },
        propsMeta: {
            modelValue: { label: '颜色', type: 'color' },
            showAlpha: { label: '支持透明度', type: 'boolean' }
        },
        defaultStyle: { width: 'auto', height: 'auto' }
    },
    {
      type: 'el-upload',
      label: '上传',
      category: 'form',
      defaultProps: { label: '点击上传', action: '', autoUpload: false, multiple: false, disabled: false, showFileList: false, listType: 'text' },
      propsMeta: {
        label: { label: '按钮文案', type: 'string' },
        action: { label: '上传地址', type: 'string' },
        autoUpload: { label: '自动上传', type: 'boolean' },
        multiple: { label: '多选', type: 'boolean' },
        disabled: { label: '禁用', type: 'boolean' },
        showFileList: { label: '显示列表', type: 'boolean' },
        listType: {
          label: '列表类型',
          type: 'select',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Picture', value: 'picture' },
            { label: 'Picture Card', value: 'picture-card' }
          ]
        }
      },
      defaultStyle: { width: '120px', height: 'auto' }
    }
  ],
  'data': [
    {
      type: 'el-tag',
      label: '标签',
      category: 'data',
      defaultProps: { type: 'success', closable: false, label: '标签', effect: 'light', round: false },
      propsMeta: {
        label: { label: '标签内容', type: 'string' },
        type: {
          label: '类型',
          type: 'select',
          options: [
            { label: 'Success', value: 'success' },
            { label: 'Info', value: 'info' },
            { label: 'Warning', value: 'warning' },
            { label: 'Danger', value: 'danger' },
            { label: 'Default', value: '' }
          ]
        },
        effect: {
          label: '主题',
          type: 'select',
          options: [
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
            { label: 'Plain', value: 'plain' }
          ]
        },
        closable: { label: '可关闭', type: 'boolean' },
        round: { label: '圆角', type: 'boolean' }
      },
      defaultStyle: { width: 'auto', height: 'auto' }
    },
    {
      type: 'el-progress',
      label: '进度条',
      category: 'data',
      defaultProps: { percentage: 50, type: 'line', status: '', strokeWidth: 6, indeterminate: false, duration: 3 },
      propsMeta: {
        percentage: { label: '百分比', type: 'number', min: 0, max: 100 },
        type: {
          label: '类型',
          type: 'select',
          options: [
            { label: 'Line', value: 'line' },
            { label: 'Circle', value: 'circle' },
            { label: 'Dashboard', value: 'dashboard' }
          ]
        },
        status: {
          label: '状态',
          type: 'select',
          options: [
            { label: 'Default', value: '' },
            { label: 'Success', value: 'success' },
            { label: 'Exception', value: 'exception' },
            { label: 'Warning', value: 'warning' }
          ]
        },
        strokeWidth: { label: '进度条宽度', type: 'number', min: 1 },
        indeterminate: { label: '动画', type: 'boolean' }
      },
      defaultStyle: { width: '300px', height: 'auto' },
      span: 2
    },
    {
      type: 'el-badge',
      label: '徽章',
      category: 'data',
      defaultProps: { value: 12, type: 'danger', isDot: false, hidden: false, max: 99 },
      propsMeta: {
        value: { label: '显示值', type: 'string' },
        max: { label: '最大值', type: 'number' },
        isDot: { label: '小圆点', type: 'boolean' },
        hidden: { label: '隐藏', type: 'boolean' },
        type: {
          label: '类型',
          type: 'select',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Danger', value: 'danger' },
            { label: 'Info', value: 'info' }
          ]
        }
      },
      defaultStyle: { width: '60px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
    },
    {
      type: 'el-avatar',
      label: '头像',
      category: 'data',
      defaultProps: { shape: 'circle', size: 'default', fit: 'cover', src: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png' },
      propsMeta: {
        src: { label: '图片地址', type: 'string' },
        size: {
          label: '尺寸',
          type: 'select',
          options: [
            { label: 'Large', value: 'large' },
            { label: 'Default', value: 'default' },
            { label: 'Small', value: 'small' }
          ]
        },
        shape: {
          label: '形状',
          type: 'select',
          options: [
            { label: 'Circle', value: 'circle' },
            { label: 'Square', value: 'square' }
          ]
        },
        fit: {
          label: '适应方式',
          type: 'select',
          options: [
            { label: 'Fill', value: 'fill' },
            { label: 'Contain', value: 'contain' },
            { label: 'Cover', value: 'cover' },
            { label: 'None', value: 'none' },
            { label: 'ScaleDown', value: 'scale-down' }
          ]
        }
      },
      defaultStyle: { width: '40px', height: '40px' }
    },
    {
      type: 'el-card',
      label: '卡片',
      category: 'data',
      defaultProps: { header: '卡片标题', shadow: 'always' },
      propsMeta: {
        header: { label: '标题', type: 'string' },
        shadow: {
          label: '阴影显示',
          type: 'select',
          options: [
            { label: 'Always', value: 'always' },
            { label: 'Hover', value: 'hover' },
            { label: 'Never', value: 'never' }
          ]
        }
      },
      defaultStyle: { width: '300px', height: 'auto' },
      span: 2
    },
    {
        type: 'el-empty',
        label: '空状态',
        category: 'data',
        defaultProps: { description: '暂无数据', imageSize: 100 },
        propsMeta: {
            description: { label: '描述文字', type: 'string' },
            image: { label: '图片地址', type: 'string' },
            imageSize: { label: '图片大小', type: 'number' }
        },
        defaultStyle: { width: '200px', height: 'auto' },
        span: 2
    },
    {
        type: 'el-image',
        label: '图片',
        category: 'data',
        defaultProps: { src: 'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg', fit: 'cover', lazy: false },
        propsMeta: {
            src: { label: '图片地址', type: 'string' },
            fit: {
                label: '适应方式',
                type: 'select',
                options: [
                    { label: 'Fill', value: 'fill' },
                    { label: 'Contain', value: 'contain' },
                    { label: 'Cover', value: 'cover' },
                    { label: 'None', value: 'none' },
                    { label: 'ScaleDown', value: 'scale-down' }
                ]
            },
            lazy: { label: '懒加载', type: 'boolean' }
        },
        defaultStyle: { width: '100px', height: '100px' }
    },
    {
      type: 'el-table',
      label: '表格',
      category: 'data',
      defaultProps: {
        data: [
          { date: '2016-05-03', name: 'Tom', address: 'No. 189, Grove St, Los Angeles' },
          { date: '2016-05-02', name: 'John', address: 'No. 189, Grove St, Los Angeles' },
          { date: '2016-05-04', name: 'Morgan', address: 'No. 189, Grove St, Los Angeles' }
        ],
        stripe: true,
        border: true
      },
      propsMeta: {
        stripe: { label: '斑马纹', type: 'boolean' },
        border: { label: '纵向边框', type: 'boolean' },
        data: {
          label: '数据源',
          type: 'array',
          itemType: 'object',
          properties: {
            date: { label: '日期', type: 'string' },
            name: { label: '姓名', type: 'string' },
            address: { label: '地址', type: 'string' }
          }
        }
      },
      defaultStyle: { width: '600px', height: 'auto' },
      span: 2
    },
    {
      type: 'el-pagination',
      label: '分页',
      category: 'data',
      defaultProps: {
        total: 100,
        pageSize: 10,
        currentPage: 1,
        layout: 'prev, pager, next',
        background: true
      },
      propsMeta: {
        total: { label: '总条目数', type: 'number' },
        pageSize: { label: '每页显示条目个数', type: 'number' },
        currentPage: { label: '当前页码', type: 'number' },
        background: { label: '背景色', type: 'boolean' },
        layout: { label: '布局', type: 'string' }
      },
      defaultStyle: { width: 'auto', height: 'auto' },
      span: 2
    },
    {
      type: 'el-descriptions',
      label: '描述列表',
      category: 'data',
      defaultProps: {
        title: '用户信息',
        border: true,
        column: 2,
        items: [
          { label: '姓名', value: 'Tom' },
          { label: '电话', value: '13800000000' },
          { label: '地址', value: '上海市' }
        ]
      },
      propsMeta: {
        title: { label: '标题', type: 'string' },
        border: { label: '边框', type: 'boolean' },
        column: { label: '列数', type: 'number', min: 1 },
        items: {
          label: '条目',
          type: 'array',
          itemType: 'object',
          properties: {
            label: { label: '标题', type: 'string' },
            value: { label: '内容', type: 'string' }
          }
        }
      },
      defaultStyle: { width: '420px', height: 'auto' },
      span: 2
    },
    {
      type: 'el-timeline',
      label: '时间线',
      category: 'data',
      defaultProps: {
        items: [
          { timestamp: '2026-01-08', content: '创建', type: 'primary', hollow: false, center: false },
          { timestamp: '2026-01-09', content: '处理', type: 'success', hollow: false, center: false },
          { timestamp: '2026-01-10', content: '完成', type: 'info', hollow: true, center: false }
        ]
      },
      propsMeta: {
        items: {
          label: '条目',
          type: 'array',
          itemType: 'object',
          properties: {
            timestamp: { label: '时间', type: 'string' },
            content: { label: '内容', type: 'string' },
            type: {
              label: '类型',
              type: 'select',
              options: [
                { label: 'Primary', value: 'primary' },
                { label: 'Success', value: 'success' },
                { label: 'Warning', value: 'warning' },
                { label: 'Danger', value: 'danger' },
                { label: 'Info', value: 'info' },
                { label: 'Default', value: '' }
              ]
            },
            hollow: { label: '空心', type: 'boolean' },
            center: { label: '居中', type: 'boolean' }
          }
        }
      },
      defaultStyle: { width: '360px', height: 'auto' },
      span: 2
    },
    {
      type: 'el-carousel',
      label: '走马灯',
      category: 'data',
      defaultProps: {
        height: '160px',
        autoplay: true,
        interval: 3000,
        arrow: 'hover',
        items: ['Slide 1', 'Slide 2', 'Slide 3']
      },
      propsMeta: {
        height: { label: '高度', type: 'string' },
        autoplay: { label: '自动播放', type: 'boolean' },
        interval: { label: '间隔(ms)', type: 'number', min: 0 },
        arrow: {
          label: '箭头',
          type: 'select',
          options: [
            { label: 'Always', value: 'always' },
            { label: 'Hover', value: 'hover' },
            { label: 'Never', value: 'never' }
          ]
        },
        items: { label: '内容列表', type: 'array', itemType: 'string' }
      },
      defaultStyle: { width: '360px', height: '160px' },
      span: 2
    },
    {
      type: 'el-collapse',
      label: '折叠面板',
      category: 'data',
      defaultProps: {
        accordion: false,
        modelValue: [],
        items: [
          { name: '1', title: '一致性 Consistency', content: '与现实生活一致，与用户认知一致。' },
          { name: '2', title: '反馈 Feedback', content: '通过界面元素提供明确反馈。' }
        ]
      },
      propsMeta: {
        accordion: { label: '手风琴', type: 'boolean' },
        modelValue: { label: '展开项', type: 'array', itemType: 'string' },
        items: {
          label: '面板列表',
          type: 'array',
          itemType: 'object',
          properties: {
            name: { label: '名称', type: 'string' },
            title: { label: '标题', type: 'string' },
            content: { label: '内容', type: 'string' }
          }
        }
      },
      defaultStyle: { width: '420px', height: 'auto' },
      span: 2
    },
    {
      type: 'el-table',
      label: '表格(高级)',
      category: 'data',
      defaultProps: {
        data: [
          { date: '2016-05-03', name: 'Tom', address: 'No. 189, Grove St, Los Angeles' },
          { date: '2016-05-02', name: 'John', address: 'No. 189, Grove St, Los Angeles' },
          { date: '2016-05-04', name: 'Morgan', address: 'No. 189, Grove St, Los Angeles' }
        ],
        columns: [
          { prop: 'date', label: '日期' },
          { prop: 'name', label: '姓名' },
          { prop: 'address', label: '地址' }
        ],
        stripe: true,
        border: true
      },
      propsMeta: {
        stripe: { label: '斑马纹', type: 'boolean' },
        border: { label: '纵向边框', type: 'boolean' },
        data: {
          label: '数据源',
          type: 'array',
          itemType: 'object',
          properties: {
            date: { label: '日期', type: 'string' },
            name: { label: '姓名', type: 'string' },
            address: { label: '地址', type: 'string' }
          }
        },
        columns: {
          label: '列定义',
          type: 'array',
          itemType: 'object',
          properties: {
            prop: { label: '字段', type: 'string' },
            label: { label: '标题', type: 'string' }
          }
        }
      },
      defaultStyle: { width: '600px', height: 'auto' },
      span: 2
    }
  ],
  'navigation': [
    {
      type: 'el-menu',
      label: '菜单',
      category: 'navigation',
      defaultProps: { 
        mode: 'horizontal', 
        defaultActive: '1',
        items: [
          { index: '1', label: '处理中心' },
          { index: '2', label: '我的工作台' },
          { index: '3', label: '消息中心' },
          { index: '4', label: '订单管理' }
        ]
      }, 
      propsMeta: {
        mode: { 
          label: '模式', 
          type: 'select',
          options: [
            { label: '水平', value: 'horizontal' },
            { label: '垂直', value: 'vertical' }
          ]
        },
        defaultActive: { label: '默认激活', type: 'string' },
        items: {
          label: '菜单项',
          type: 'array',
          itemType: 'object',
          properties: {
            index: { label: '索引', type: 'string' },
            label: { label: '名称', type: 'string' }
          }
        }
      },
      defaultStyle: { width: '800px', height: 'auto' },
      span: 2
    },
    {
      type: 'el-tabs',
      label: '标签页',
      category: 'navigation',
      defaultProps: { 
        type: 'border-card', 
        modelValue: 'first',
        items: [
          { label: '用户管理', name: 'first', content: '用户管理内容' },
          { label: '配置管理', name: 'second', content: '配置管理内容' },
          { label: '角色管理', name: 'third', content: '角色管理内容' },
          { label: '定时任务补偿', name: 'fourth', content: '定时任务补偿内容' }
        ]
      }, 
      propsMeta: {
        type: { 
          label: '风格', 
          type: 'select',
          options: [
            { label: '默认', value: '' },
            { label: '卡片化', value: 'card' },
            { label: '带有边框', value: 'border-card' }
          ]
        },
        tabPosition: {
          label: '位置',
          type: 'select',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Right', value: 'right' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Left', value: 'left' }
          ]
        },
        modelValue: { label: '选中项', type: 'string' },
        items: {
          label: '标签项',
          type: 'array',
          itemType: 'object',
          properties: {
            label: { label: '标题', type: 'string' },
            name: { label: '名称', type: 'string' },
            content: { label: '内容', type: 'string' }
          }
        }
      },
      defaultStyle: { width: '600px', height: 'auto' },
      span: 2
    },
    {
      type: 'el-breadcrumb',
      label: '面包屑',
      category: 'navigation',
      defaultProps: { 
        separator: '/',
        items: [
          { label: '首页', to: '/' },
          { label: '活动管理', to: '/activity' },
          { label: '活动列表', to: '/activity/list' },
          { label: '活动详情', to: '' }
        ]
      }, 
      propsMeta: {
        separator: { label: '分隔符', type: 'string' },
        items: {
          label: '面包屑项',
          type: 'array',
          itemType: 'object',
          properties: {
            label: { label: '名称', type: 'string' },
            to: { label: '跳转路径', type: 'string' }
          }
        }
      },
      defaultStyle: { width: 'auto', height: 'auto' },
      span: 2
    },
    {
      type: 'el-steps',
      label: '步骤条',
      category: 'navigation',
      defaultProps: { 
        active: 1, 
        finishStatus: 'success', 
        alignCenter: true, 
        simple: false,
        items: [
          { title: '步骤 1', description: '这里是步骤 1 的描述信息' },
          { title: '步骤 2', description: '这里是步骤 2 的描述信息' },
          { title: '步骤 3', description: '这里是步骤 3 的描述信息' }
        ]
      },
      propsMeta: {
        active: { label: '当前步骤', type: 'number' },
        finishStatus: { 
          label: '结束状态', 
          type: 'select',
          options: [
            { label: 'Wait', value: 'wait' },
            { label: 'Process', value: 'process' },
            { label: 'Finish', value: 'finish' },
            { label: 'Error', value: 'error' },
            { label: 'Success', value: 'success' }
          ] 
        },
        alignCenter: { label: '居中对齐', type: 'boolean' },
        simple: { label: '简洁风格', type: 'boolean' },
        items: {
          label: '步骤项',
          type: 'array',
          itemType: 'object',
          properties: {
            title: { label: '标题', type: 'string' },
            description: { label: '描述', type: 'string' }
          }
        }
      },
      defaultStyle: { width: '600px', height: 'auto' },
      span: 2
    },
    {
      type: 'el-dropdown',
      label: '下拉菜单',
      category: 'navigation',
      defaultProps: {
        label: '下拉菜单',
        splitButton: false,
        type: 'primary',
        size: 'default',
        items: [
          { command: 'a', label: 'Action 1' },
          { command: 'b', label: 'Action 2' },
          { command: 'c', label: 'Action 3', disabled: true },
          { command: 'd', label: 'Action 4', divided: true }
        ]
      },
      propsMeta: {
        label: { label: '按钮文本', type: 'string' },
        splitButton: { label: '分裂按钮', type: 'boolean' },
        type: { 
          label: '按钮类型', 
          type: 'select', 
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Danger', value: 'danger' },
            { label: 'Info', value: 'info' },
            { label: 'Default', value: '' }
          ] 
        },
        size: {
          label: '尺寸',
          type: 'select',
          options: [
            { label: 'Large', value: 'large' },
            { label: 'Default', value: 'default' },
            { label: 'Small', value: 'small' }
          ]
        },
        items: {
          label: '菜单项',
          type: 'array',
          itemType: 'object',
          properties: {
            label: { label: '名称', type: 'string' },
            command: { label: '指令', type: 'string' },
            disabled: { label: '禁用', type: 'boolean' },
            divided: { label: '分割线', type: 'boolean' }
          }
        }
      },
      defaultStyle: { width: 'auto', height: 'auto' }
    },
    {
      type: 'el-page-header',
      label: '页头',
      category: 'navigation',
      defaultProps: {
        content: '详情页面',
        title: 'Back'
      },
      propsMeta: {
        content: { label: '内容', type: 'string' },
        title: { label: '返回标题', type: 'string' }
      },
      defaultStyle: { width: '800px', height: 'auto' }
    }
  ],
  'feedback': [
    {
      type: 'el-alert',
      label: '警告',
      category: 'feedback',
      defaultProps: { title: '成功提示的文案', type: 'success', showIcon: true, closable: true, center: false, effect: 'light' },
      propsMeta: {
        title: { label: '标题', type: 'string' },
        type: {
          label: '类型',
          type: 'select',
          options: [
            { label: 'Success', value: 'success' },
            { label: 'Info', value: 'info' },
            { label: 'Warning', value: 'warning' },
            { label: 'Error', value: 'error' }
          ]
        },
        effect: {
          label: '主题',
          type: 'select',
          options: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' }
          ]
        },
        showIcon: { label: '显示图标', type: 'boolean' },
        closable: { label: '可关闭', type: 'boolean' },
        center: { label: '文字居中', type: 'boolean' }
      },
      defaultStyle: { width: '400px', height: 'auto' },
      span: 2
    },
    {
        type: 'el-skeleton',
        label: '骨架屏',
        category: 'feedback',
        defaultProps: { rows: 5, animated: true, count: 1, loading: true },
        propsMeta: {
            rows: { label: '行数', type: 'number', min: 1 },
            animated: { label: '动画', type: 'boolean' },
            count: { label: '渲染数量', type: 'number', min: 1 },
            loading: { label: '加载中', type: 'boolean' },
            throttle: { label: '延迟(ms)', type: 'number' }
        },
        defaultStyle: { width: '400px', height: 'auto' }
    }
  ]
};
