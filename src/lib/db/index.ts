import admin from "firebase-admin"
import { FieldValue, initializeFirestore } from "firebase-admin/firestore"
import { ApiError } from "next/dist/server/api-utils"

import { getApp, priceConverter, productConverter, userConverter } from "@/lib/db/firebase-helper"
import { config } from "@/lib/util/config"
import { dataUrlToBase64 } from "@/lib/util/image-helper"
import { FileStorage, PriceData, ProudctData, UserData } from "@/types/db"

const { firebaseProjectId, firebaseClientEmail, firebasePrivateKey } = config

// set env variable FIRESTORE_EMULATOR_HOST to use firebase emulator

// Firebase config for web api (not needed for firebase-admin)
// const firebaseConfig = {
//   apiKey: FIREBASE_API_KEY,
//   authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
//   projectId: FIREBASE_PROJECT_ID,
//   storageBucket: `${FIREBASE_PROJECT_ID}.appspot.com`,
//   messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
//   appId: FIREBASE_APP_ID,
//   measurementId: FIREBASE_MEASUREMENT_ID,
// }

console.log("initting")
console.log("initting")
console.log("initting")

const app = getApp()
const firestore = initializeFirestore(app)

// this function will throw if it is called more than once (ex: when hot-reloading)
try {
  firestore.settings({ ignoreUndefinedProperties: true })
} catch {}

const _user = firestore.collection("user").withConverter(userConverter)
export const user: UserData = {
  async get(id) {
    const snap = await _user.doc(id).get()
    return snap.data()
  },
  async getOrThrow(id) {
    const snap = await _user.doc(id).get()
    const data = snap.data()
    if (!data) throw new ApiError(500, "User not found in db")
    return data
  },
  async set(id, data) {
    await _user.doc(id).set(data, { merge: true })
  },
  async delete(id) {
    await _user.doc(id).delete()
  },
  async append(id, data) {
    for (const key in data) {
      // @ts-ignore
      const val = data[key as keyof data]
      // @ts-ignore
      data[key] = FieldValue.arrayUnion(data[key])
    }
    await _user.doc(id).update(data)
  },
  async queryFirst(key, op, value) {
    const query = await _user.where(key, op, value).get()
    return query.docs[0]?.data()
  },
}

const storageBucket = admin.storage().bucket(`${firebaseProjectId}.appspot.com`)
export const fileStorage: FileStorage = {
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

const _product = firestore.collection("product").withConverter(productConverter)
export const product: ProudctData = {
  async get(id) {
    const snap = await _product.doc(id).get()
    return snap.data()
  },
  async getOrThrow(id) {
    const snap = await _product.doc(id).get()
    const data = snap.data()
    if (!data) throw new ApiError(500, "Product not found in db")
    return data
  },
  async set(id, data) {
    await _product.doc(id).set(data, { merge: true })
  },
  async delete(id) {
    await _product.doc(id).delete()
  },
}

const _price = firestore.collection("price").withConverter(priceConverter)
export const price: PriceData = {
  async get(id) {
    const snap = await _price.doc(id).get()
    return snap.data()
  },
  async getOrThrow(id) {
    const snap = await _price.doc(id).get()
    const data = snap.data()
    if (!data) throw new ApiError(500, "Price not found in db")
    return data
  },
  async set(id, data) {
    await _price.doc(id).set(data, { merge: true })
  },
  async delete(id) {
    await _price.doc(id).delete()
  },
}
