import type { ComponentSchema } from '@/types/editor';

export default {
  type: 'TeamCard',
  label: '团队卡片',
  icon: 'Postcard',
  category: 'custom',
  defaultProps: {
    title: '美味汉堡',
    time: '2023-10-01',
    buttonText: '操作',
    imageUrl: 'https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png'
  },
  propsMeta: {
    title: { label: '标题', type: 'string' },
    time: { label: '时间', type: 'string' },
    buttonText: { label: '按钮文字', type: 'string' },
    imageUrl: { label: '图片地址', type: 'string' }
  },
  defaultStyle: {
    width: '240px',
    height: 'auto'
  }
} as Partial<ComponentSchema>;
