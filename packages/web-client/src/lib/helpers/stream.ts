import Log from '$lib/utils/Log'
import { authState } from '$stores/auth'
import { get } from 'svelte/store'

const cfWorkerHost = import.meta.env.VITE_CLOUDFLARE_WORKERS_API_HOST

async function generateUrl() {
  const authStateData = get(authState)
  const res = await fetch(`${cfWorkerHost}/video/getVideoUploadURL`, {
    method: 'POST',
    body: JSON.stringify({
      principalId: authStateData.idString || '',
      fileName: Date.now().toString(),
    }),
  })
  const body = await res.json()
  if (body.success) {
    return body.result as { uploadURL: string; uid: string }
  } else {
    return undefined
  }
}

export async function uploadVideoToStream(
  file: Blob | File,
  onProgress: any,
): Promise<UploadVideoToStream> {
  const uploadRes = await generateUrl()
  if (!uploadRes || !uploadRes.uploadURL) {
    return {
      success: false,
      errorMessage: "Couldn't generate upload Url",
    }
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) =>
      onProgress(e.loaded / e.total),
    )
    xhr.addEventListener('load', () =>
      resolve({ success: true, uid: uploadRes.uid }),
    )
    xhr.addEventListener('error', (e) =>
      resolve({
        success: false,
        error: e,
        errorMessage: 'Something went wrong while uploading file',
      }),
    )
    xhr.addEventListener('abort', () =>
      resolve({ success: false, errorMessage: 'Upload cancelled by user' }),
    )
    xhr.open('POST', uploadRes.uploadURL, true)
    const formData = new FormData()
    formData.append('file', file)
    xhr.send(formData)
  })
}

export async function checkVideoStatus(uid: string): Promise<CheckVideoStatus> {
  try {
    const req = await fetch(
      `${cfWorkerHost}/video/${uid}/getVideoProcessingStatus`,
      {
        method: 'GET',
      },
    )
    const result: CheckVideoStatusResult = await req.json()
    if (result.readyToStream && result.mp4Url == '') {
      enableMp4Downloads(uid)
    }
    return {
      success: true,
      result,
    }
  } catch (e) {
    return {
      success: false,
      error: e,
      errorMessage:
        'Something went wrong while checking status for uid: ' + uid,
    }
  }
}

export async function enableMp4Downloads(uid: string) {
  try {
    await fetch(`${cfWorkerHost}/video/${uid}/enableMp4Download`, {
      method: 'GET',
    })
  } catch (e) {
    Log({ error: e, from: '1 enableMp4Downloads' }, 'error')
  }
}

type RequestError = {
  success: false
  errorMessage: string
  error?: any
}

export type CheckVideoStatusResult = {
  readyToStream: boolean
  thumbnail: string
  mp4Url: string
  playback?: {
    hls?: string
    dash?: string
  }
}

type CheckVideoStatus =
  | RequestError
  | {
      success: true
      result: CheckVideoStatusResult
    }

type UploadVideoToStream = RequestError | { success: true; uid: string }
