<template>
    <v-app>
        <v-main>
            <v-container class="pa-4">
                <h1 class="text-h5 mb-4">動画圧縮ツール</h1>

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
                    <div class="text-subtitle-1">動画をドラッグ＆ドロップ、または</div>
                    <v-btn color="primary" @click="triggerFileSelect">ファイルを選択</v-btn>
                    <input
                        ref="fileInput"
                        type="file"
                        accept="video/*"
                        class="d-none"
                        @change="handleFileChange"
                    />
                </v-card>

                <!-- ファイル名の表示 -->
                <div v-if="file" class="mb-4">選択中: {{ file.name }}</div>

                <!-- 圧縮設定 -->
                <v-card class="mb-4 pa-4" outlined>
                    <v-row>
                        <v-col cols="12" sm="6">
                            <v-select
                                v-model="resolution"
                                :items="['1920x1080', '1280x720', '854x480']"
                                label="解像度"
                            />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-select
                                v-model="bitrate"
                                :items="['3000k', '1500k', '800k']"
                                label="ビットレート"
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
                    圧縮開始
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
                        ダウンロード
                    </v-btn>
                    <div class="mt-2" v-if="compressedSize !== null">
                        圧縮後のサイズ：{{ (compressedSize / (1024 * 1024)).toFixed(2) }} MB
                    </div>
                </div>
            </v-container>
        </v-main>
    </v-app>

    <v-dialog v-model="loading" persistent width="300">
        <v-card class="pa-4">
            <v-progress-circular indeterminate color="primary" />
            <div class="mt-4 text-center">圧縮中です…</div>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'

const file = ref<File | null>(null)
const resolution = ref('1280x720')
const bitrate = ref('1500k')
const compressedUrl = ref<string | null>(null)
const compressedSize = ref<number | null>(null)
const isDragging = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileSelect = () => {
    fileInput.value?.click()
}

const handleFileChange = () => {
    const selectedFile = fileInput.value?.files?.[0]
    if (selectedFile) {
        file.value = selectedFile
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
        } else {
            alert('動画ファイルをドロップしてください')
        }
    }
}

const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
})

const loading = ref(false)

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

        console.log('FFmpegコマンド:', [
            '-i', inputFileName,
            '-vf', `scale=${width}:${height}`,
            '-b:v', bitrateValue,
            '-preset', 'veryfast',
            outputFileName
        ])
        
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
        alert('圧縮に失敗しました')
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
