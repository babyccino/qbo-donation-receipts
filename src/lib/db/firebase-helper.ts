import type { Timestamp } from "@google-cloud/firestore"
import admin from "firebase-admin"
import { App } from "firebase-admin/app"
import { CollectionReference } from "firebase-admin/firestore"
import { Storage } from "firebase-admin/storage"
import { ApiError } from "next/dist/server/api-utils"

import { timestampToDate } from "@/lib/db/db-helper"
import { config } from "@/lib/util/config"
import { dataUrlToBase64 } from "@/lib/util/image-helper"
import { Collection, FileStorage, Price, Product, User } from "@/types/db"

const { firebaseProjectId, firebaseClientEmail, firebasePrivateKey } = config

type DateToTimestamp<T> = T extends Date
  ? Timestamp
  : T extends object
  ? {
      [K in keyof T]: DateToTimestamp<T[K]>
    }
  : T
type FirebaseSnap = FirebaseFirestore.QueryDocumentSnapshot<DateToTimestamp<User>>
export const userConverter = {
  toFirestore: (data: User) => data,
  fromFirestore: (snap: FirebaseSnap) => {
    const rawData = snap.data()
    return timestampToDate(rawData) satisfies User
  },
}

export const productConverter = {
  toFirestore: (data: Product) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => snap.data() as Product,
}
export const priceConverter = {
  toFirestore: (data: Price) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => snap.data() as Price,
}
export type Bucket = ReturnType<Storage["bucket"]>

export function getApp() {
  if (!admin.apps.length) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      }),
    })
  } else {
    return admin.apps[0] as App
  }
}

export function makeFirebaseCollection<T>(collectionRef: CollectionReference<T>): Collection<T> {
  return {
    async get(id) {
      const snap = await collectionRef.doc(id).get()
      return snap.data()
    },
    async getOrThrow(id) {
      const snap = await collectionRef.doc(id).get()
      const data = snap.data()
      if (!data) throw new ApiError(500, "User not found in db")
      return data
    },
    async set(id, data) {
      await collectionRef.doc(id).set(data as any, { merge: true })
    },
    async delete(id) {
      await collectionRef.doc(id).delete()
    },
  }
}

export function makeFirebaseFilestorage(storageBucket: Bucket): FileStorage {
  return {
    async saveFile(id, fileName, data, opts) {
      const fullPath = `${id}/${fileName}`
      const file = storageBucket.file(fullPath)
      await file.save(data, opts)
      if (opts?.publicUrl) await file.makePublic()
      return fullPath
    },
    async downloadFileBase64(id, fileName) {
      const fullPath = `${id}/${fileName}`
      const file = await storageBucket.file(fullPath).download()
      return file[0].toString("base64")
    },
    async downloadFileBase64DataUrl(id, fileName) {
      const fileString = this.downloadFileBase64(id, fileName)
      const match = fileName.match(/[^.]+$/)
      if (!match) throw new Error("")
      const extension = match[0]
      // TODO other mime tyes
      return `data:image/${extension};base64,${fileString}`
    },
    async downloadFileBuffer(id, fileName) {
      const dataUrl = await this.downloadFileBase64DataUrl(id, fileName)
      const b64 = dataUrlToBase64(dataUrl)
      return Buffer.from(b64, "base64")
    },
  }
}
