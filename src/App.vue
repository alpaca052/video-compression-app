<template>
    <v-app>
        <v-main>
            <v-container class="pa-4">
                <div class="d-flex justify-end mb-4">
                    <v-card elevation="1" class="pa-2" style="max-width: 180px">
                        <v-row align="center">
                            <v-col cols="auto">
                                <v-icon>mdi-translate</v-icon>
                            </v-col>
                            <v-col>
                                <v-select
                                    v-model="locale"
                                    :items="[
                                        { title: 'English', value: 'en' },
                                        { title: '日本語', value: 'ja' }
                                    ]"
                                    item-title="title"
                                    item-value="value"
                                    density="compact"
                                    hide-details
                                    variant="outlined"
                                    @update:modelValue="changeLocale"
                                />
                            </v-col>
                        </v-row>
                    </v-card>
                </div>


                <h1 class="text-h5 mb-4">{{ $t('title') }}</h1>

                <!-- アップロードエリア -->
                <v-card
                    :class="['drop-area', { dragging: isDragging }]"
                    class="mb-4 pa-4 d-flex flex-column align-center justify-center"
                    height="200"
                    outlined
                    @drop.prevent="handleDrop"
                    @dragover.prevent="handleDragOver"
                    @dragleave="handleDragLeave"
                >
                    <div class="text-subtitle-1">{{ $t('dropMessage') }}</div>
                    <v-btn color="primary" @click="triggerFileSelect">{{ $t('selectFile') }}</v-btn>
                    <input
                        ref="fileInput"
                        type="file"
                        accept="video/*"
                        class="d-none"
                        @change="handleFileChange"
                    />
                </v-card>

                <!-- ファイル名と情報の表示 -->
                <div v-if="file" class="mb-2">{{ $t('selected') }}: {{ file.name }}</div>
                <div v-if="file" class="mb-4 text-caption text-grey">
                    {{ $t('size') }}: {{ (file.size / (1024 * 1024)).toFixed(2) }} MB<br />
                    {{ $t('originalResolution') }}: {{ originalResolution ?? $t('fetching') }}<br />
                    {{ $t('originalBitrate') }}: {{ originalBitrate ?? $t('fetching') }}
                </div>

                <!-- 圧縮設定 -->
                <v-card class="mb-4 pa-4" outlined>
                    <v-row>
                        <v-col cols="12" sm="6">
                            <v-select
                                v-model="resolution"
                                :items="['1920x1080', '1280x720', '854x480']"
                                :label="$t('resolution')"
                            />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-select
                                v-model="bitrate"
                                :items="['3000k', '1500k', '800k']"
                                :label="$t('bitrate')"
                            />
                        </v-col>
                    </v-row>
                </v-card>

                <!-- 圧縮ボタン -->
                <v-btn
                    color="success"
                    :disabled="!file"
                    @click="startCompression"
                >
                    {{ $t('compress') }}
                </v-btn>

                <!-- 結果 -->
                <div v-if="compressedUrl" class="mt-4">
                    <video controls :src="compressedUrl" width="100%"></video>
                    <v-btn
                        color="primary"
                        class="mt-2"
                        :href="compressedUrl"
                        download="compressed.mp4"
                    >
                        {{ $t('downloading') }}
                    </v-btn>
                    <div class="mt-2" v-if="compressedSize !== null">
                        {{ $t('sizeAfter') }}：{{ (compressedSize / (1024 * 1024)).toFixed(2) }} MB
                    </div>
                </div>
            </v-container>
        </v-main>
    </v-app>

    <v-dialog v-model="loading" persistent width="300">
        <v-card class="pa-4">
            <v-progress-circular indeterminate color="primary" />
            <div class="mt-4 text-center">{{ $t('loading') }}</div>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'

const { t, locale } = useI18n()
const availableLocales = ['en', 'ja']
const changeLocale = (val: string) => locale.value = val

const file = ref<File | null>(null)
const resolution = ref('1280x720')
const bitrate = ref('1500k')
const compressedUrl = ref<string | null>(null)
const compressedSize = ref<number | null>(null)
const originalResolution = ref<string | null>(null)
const originalBitrate = ref<string | null>(null)
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)

const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
})

const triggerFileSelect = () => {
    fileInput.value?.click()
}

const handleFileChange = async () => {
    const selectedFile = fileInput.value?.files?.[0]
    if (selectedFile) {
        file.value = selectedFile
        originalResolution.value = null
        originalBitrate.value = null

        try {
            if (!ffmpeg.isLoaded()) {
                await ffmpeg.load()
            }

            const inputFileName = 'probe_input.mp4'
            ffmpeg.FS('writeFile', inputFileName, await fetchFile(selectedFile))

            const logs: string[] = []
            ffmpeg.setLogger(({ message }) => logs.push(message))
            try {
                await ffmpeg.run('-i', inputFileName)
            } catch (e) {}

            const videoLog = logs.find(msg => msg.includes('Stream') && msg.includes('Video'))
            if (videoLog) {
                const resMatch = videoLog.match(/(\d{2,5})x(\d{2,5})/)
                const bitrateMatch = videoLog.match(/(\d+) kb\/s/)

                if (resMatch) {
                    originalResolution.value = `${resMatch[1]}x${resMatch[2]}`
                }
                if (bitrateMatch) {
                    originalBitrate.value = `${bitrateMatch[1]} kb/s`
                }
            }

            ffmpeg.FS('unlink', inputFileName)
        } catch (err) {
            console.error('メタ情報の取得失敗:', err)
            alert(t('errorMeta'))
        }
    }
}

const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = true
}

const handleDragLeave = () => {
    isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = false
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile.type.startsWith('video/')) {
            file.value = droppedFile
            handleFileChange()
        } else {
            alert(t('errorFileType'))
        }
    }
}

const startCompression = async () => {
    if (!file.value) return
    loading.value = true
    compressedUrl.value = null
    compressedSize.value = null

    try {
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load()
        }

        const inputFileName = 'input.mp4'
        const outputFileName = 'output.mp4'

        ffmpeg.FS('writeFile', inputFileName, await fetchFile(file.value))

        const res = resolution.value
        const [width, height] = res.includes('x') ? res.split('x') : ['1280', '720']
        const bitrateValue = bitrate.value || '1500k'

        await ffmpeg.run(
            '-i', inputFileName,
            '-c:v', 'libx264',
            '-b:v', bitrateValue,
            '-vf', `scale=${width}:${height}`,
            outputFileName
        )

        const data = ffmpeg.FS('readFile', outputFileName)
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' })
        compressedUrl.value = URL.createObjectURL(videoBlob)
        compressedSize.value = videoBlob.size
    } catch (err) {
        console.error('圧縮エラー:', err)
        alert(t('errorCompress'))
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.d-none {
    display: none;
}

.drop-area.dragging {
    border: 2px dashed #1976d2;
    background-color: #e3f2fd;
    transition: all 0.2s ease;
}
</style>
