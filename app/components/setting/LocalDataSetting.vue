<script setup lang="ts">
import { ref } from 'vue'
import { BaseButton, PopConfirm, Toast } from '@/base'
import { useRuntimeStore } from '@/core/stores/runtime'
import { clearLocalData, localDataDirectory, localDataError, migrateBrowserData } from '@/core/utils/storage'
import SettingItem from './SettingItem.vue'

const { t } = useI18n()
const runtimeStore = useRuntimeStore()
const busy = ref(false)

async function clearFolder() {
  if (busy.value) return
  busy.value = true
  runtimeStore.globalLoading = true
  try {
    await clearLocalData()
    window.location.reload()
  } catch (error) {
    console.error('Clearing the local data folder failed:', error)
    runtimeStore.globalLoading = false
    busy.value = false
  }
}

async function migrate() {
  if (busy.value) return
  busy.value = true
  runtimeStore.globalLoading = true
  try {
    const count = await migrateBrowserData()
    if (count) window.location.reload()
    else Toast.warning(t('local_folder_no_browser_data', 'No browser data was found.'))
  } catch (error) {
    console.error('Browser data migration failed:', error)
    Toast.error(
      t('local_folder_migration_failed', 'Migration failed: ') +
        (error instanceof Error ? error.message : String(error))
    )
  } finally {
    runtimeStore.globalLoading = false
    busy.value = false
  }
}
</script>

<template>
  <SettingItem
    :title="t('local_folder_title', 'Local data folder')"
    :desc="
      t(
        'local_folder_desc',
        'Learning records, settings, audio and backups are saved by the local server, not in this browser.'
      )
    "
  />
  <div class="my-3 break-all font-mono" data-testid="local-data-directory">{{ localDataDirectory }}</div>
  <div v-if="localDataError" role="alert" class="text-red mb-3">{{ localDataError }}</div>
  <div class="flex flex-wrap gap-space">
    <PopConfirm
      :title="
        t(
          'local_folder_migration_confirm',
          'Copy old data from this browser into the folder? Matching records will be overwritten. Export a backup first.'
        )
      "
      @confirm="migrate"
    >
      <BaseButton size="large" :loading="busy" :disabled="busy">
        {{ t('local_folder_migrate', 'Migrate old browser data') }}
      </BaseButton>
    </PopConfirm>
    <PopConfirm
      :title="
        t(
          'local_folder_clear_confirm',
          'Permanently delete all local learning records, settings, audio and history backups? This affects every browser using this server. Remote data is not deleted. Export a backup first.'
        )
      "
      @confirm="clearFolder"
    >
      <BaseButton size="large" :loading="busy" :disabled="busy" data-testid="clear-local-data">
        {{ t('local_folder_clear', 'Clear local folder data') }}
      </BaseButton>
    </PopConfirm>
  </div>
  <div class="text-gray text-sm mt-3">
    {{
      t(
        'local_folder_hint',
        'Keep the local server running. Static-only hosting is not supported. Older open pages must reload after clearing; browser data is never restored automatically.'
      )
    }}
  </div>
  <div class="line my-3"></div>
</template>
