import admin from "firebase-admin"
import type { Timestamp } from "@google-cloud/firestore"
import { ApiError } from "next/dist/server/api-utils"

import { Price, Product, User } from "@/types/db"
import { config } from "@/lib/util/config"
import { DateToTimestamp, timestampToDate } from "./db-helper"
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

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      }),
    })
  } catch (error) {
    console.error("Firebase admin initialization error", error)
  }
}

export const firestore = admin.firestore()
// this function will throw if it is called more than once (ex: when hot-reloading)
try {
  firestore.settings({ ignoreUndefinedProperties: true })
} catch {}

type FirebaseSnap = FirebaseFirestore.QueryDocumentSnapshot<DateToTimestamp<User>>
const userConverter = {
  toFirestore: (data: User) => data,
  fromFirestore: (snap: FirebaseSnap) => {
    const rawData = snap.data()
    return timestampToDate(rawData) satisfies User
  },
}

const productConverter = {
  toFirestore: (data: Product) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => snap.data() as Product,
}
const priceConverter = {
  toFirestore: (data: Price) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => snap.data() as Price,
}

export const user = firestore.collection("user").withConverter(userConverter)
export async function getUserData(id: string) {
  const doc = await user.doc(id).get()
  const dbUser = doc.data()
  if (!dbUser) throw new ApiError(500, "user was not found in db")
  return dbUser
}

export const product = firestore.collection("product").withConverter(productConverter)
export const price = (id: string) =>
  product.doc(id).collection("price").withConverter(priceConverter)
export const storageBucket = admin.storage().bucket(`${firebaseProjectId}.appspot.com`)
export type Bucket = typeof storageBucket
