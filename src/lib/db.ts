import admin from "firebase-admin"

import { DoneeInfo } from "@/components/receipt"

// set env variable FIRESTORE_EMULATOR_HOST to use firebase emulator

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      }),
    })
  } catch (error) {
    console.error("Firebase admin initialization error", error)
  }
}

export type DbUser = {
  donee: DoneeInfo
  email: string
  id: string
  name: string
  realmId: string
  items: number[]
  date: {
    startDate: string
    endDate: string
  }
}

export const firestore = admin.firestore()

const converter = {
  toFirestore: (data: DbUser) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => snap.data() as DbUser,
}

export const user = firestore.collection("user").withConverter(converter)
