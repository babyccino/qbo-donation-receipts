import admin from "firebase-admin"
import type { Timestamp } from "@google-cloud/firestore"
import { Storage } from "firebase-admin/storage"

import { Price, Product, User } from "@/types/db"
import { timestampToDate } from "@/lib/db/db-helper"
import { config } from "@/lib/util/config"
import { App } from "firebase-admin/app"

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
