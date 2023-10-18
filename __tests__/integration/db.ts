import admin from "firebase-admin"
import { initializeFirestore } from "firebase-admin/firestore"
import {} from "firebase-admin/storage"
import { ApiError } from "next/dist/server/api-utils"

import { getApp, userConverter } from "@/lib/db/firebase-helper"
import { config } from "@/lib/util/config"
import { DeepPartial } from "@/lib/util/etc"
import { FileStorage, User, UserData } from "@/types/db"

const { firebaseProjectId } = config

const app = getApp()

export const firestore = initializeFirestore(app, { preferRest: true })

// this function will throw if it is called more than once (ex: when hot-reloading)
try {
  firestore.settings({ ignoreUndefinedProperties: true })
} catch {}

// firestore converts dates to its own timestamp type

const _user = firestore.collection("test-user").withConverter(userConverter)
const storageBucket = admin.storage().bucket(`${firebaseProjectId}.appspot.com`)

export const user: UserData = {
  async get(id: string) {
    return (await _user.doc(id).get()).data()
  },
  async getOrThrow(id: string) {
    const data = (await _user.doc(id).get()).data()
    if (!data) throw new ApiError(500, "User not found in db")
    return data
  },
  async set(id: string, data: DeepPartial<User>) {
    await _user.doc(id).set(data, { merge: true })
  },
}

export const fileStorage: FileStorage = {
  async saveFile(id, fileName, data, opts) {
    const fullPath = `test/${id}/${fileName}`
    const file = storageBucket.file(fullPath)
    await file.save(data, opts)
    if (opts?.publicUrl) await file.makePublic()
    return fullPath
  },
  async downloadFileBase64(id, fileName) {
    return ""
  },
  async downloadFileBase64DataUrl(id, fileName) {
    return ""
  },
}
