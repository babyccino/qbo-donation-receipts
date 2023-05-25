import admin from "firebase-admin"
import Stripe from "stripe"

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
  email: string
  id: string
  name: string
  realmId: string
  items?: number[]
  date?: {
    startDate: Date
    endDate: Date
  }
  donee?: DoneeInfo
  subscription?: Subscription
}

export type Subscription = {
  id: string /* primary key */
  status?: Stripe.Subscription.Status
  metadata?: Stripe.Metadata
  priceId?: string /* foreign key to prices.id */
  quantity?: number
  cancelAtPeriodEnd?: boolean
  created: string
  currentPeriodStart: string
  currentPeriodEnd: string
  endedAt?: string
  cancelAt?: string
  canceledAt?: string
  trialStart?: string
  trialEnd?: string
}

export type Product = {
  id: string /* primary key */
  active?: boolean
  name?: string
  description?: string
  image?: string
  metadata?: Stripe.Metadata
  prices?: Price[]
}

export type Price = {
  id: string /* primary key */
  active?: boolean
  description?: string
  unitAmount?: number
  currency?: string
  type?: Stripe.Price.Type
  interval?: Stripe.Price.Recurring.Interval
  intervalCount?: number
  metadata?: Stripe.Metadata
  products?: Product
}

export const firestore = admin.firestore()

const userConverter = {
  toFirestore: (data: DbUser) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = snap.data()
    const date = data.date
      ? {
          startDate: data.date.startDate.toDate(),
          endDate: data.date.endDate.toDate(),
        }
      : undefined
    return { ...data, date } as DbUser
  },
}

const productConverter = {
  toFirestore: (data: Product) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => snap.data() as Product,
}

export const user = firestore.collection("user").withConverter(userConverter)
export const product = firestore.collection("product").withConverter(productConverter)
export const storageBucket = admin.storage().bucket(`${FIREBASE_PROJECT_ID}.appspot.com`)
