import admin from "firebase-admin"
import { FieldValue, initializeFirestore } from "firebase-admin/firestore"

import {
  getApp,
  makeFirebaseCollection,
  makeFirebaseFilestorage,
  priceConverter,
  productConverter,
  userConverter,
} from "@/lib/db/firebase-helper"
import { config } from "@/lib/util/config"
import { PriceData, ProudctData, UserData } from "@/types/db"

const { firebaseProjectId } = config

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

const app = getApp()
const firestore = initializeFirestore(app)

// this function will throw if it is called more than once (ex: when hot-reloading)
try {
  firestore.settings({ ignoreUndefinedProperties: true })
} catch {}

const user = firestore.collection("user").withConverter(userConverter)
export const firestoreUser: UserData = {
  ...makeFirebaseCollection(user),
  async append(id, data) {
    for (const key in data) {
      // @ts-ignore
      const val = data[key as keyof data]
      // @ts-ignore
      data[key] = FieldValue.arrayUnion(data[key])
    }
    await user.doc(id).update(data)
  },
  async queryFirst(key, op, value) {
    const query = await user.where(key, op, value).get()
    return query.docs[0]?.data()
  },
}

const storageBucket = admin.storage().bucket(`${firebaseProjectId}.appspot.com`)
export const firebaseFileStorage = makeFirebaseFilestorage(storageBucket)

const _product = firestore.collection("product").withConverter(productConverter)
export const firestoreProduct: ProudctData = makeFirebaseCollection(_product)

const _price = firestore.collection("price").withConverter(priceConverter)
export const firestorePrice: PriceData = makeFirebaseCollection(_price)
