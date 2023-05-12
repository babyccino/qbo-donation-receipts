import admin from "firebase-admin"

import { DoneeInfo } from "@/components/receipt"

// set env variable FIRESTORE_EMULATOR_HOST to use firebase emulator

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_API_KEY,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
  FIREBASE_STORAGE_EMULATOR_HOST,
  FIREBASE_STORAGE_EMULATOR_PORT,
} = process.env

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
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY,
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
    startDate: Date
    endDate: Date
  }
}

export const firestore = admin.firestore()

const converter = {
  toFirestore: (data: DbUser) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = snap.data()
    const startDate = data.date.startDate.toDate()
    const endDate = data.date.endDate.toDate()
    return { ...data, date: { startDate, endDate } } as DbUser
  },
}

export const user = firestore.collection("user").withConverter(converter)
export const storageBucket = admin.storage().bucket(`${FIREBASE_PROJECT_ID}.appspot.com`)
