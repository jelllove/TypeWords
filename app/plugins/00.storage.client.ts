import { initializeLocalStorage } from '@/core/utils/storage'

export default defineNuxtPlugin(async () => {
  try {
    await initializeLocalStorage()
  } catch (error) {
    console.error('Local file storage initialization failed:', error)
    throw createError({
      fatal: true,
      statusCode: 503,
      statusMessage: 'Local file storage unavailable',
      message:
        '无法连接本地数据服务。请使用 pnpm run dev 或 pnpm run serve 启动，检查数据目录权限后刷新。不会回退到浏览器存储。',
    })
  }
})
