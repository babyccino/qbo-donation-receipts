import admin from "firebase-admin"
import { initializeFirestore } from "firebase-admin/firestore"
import {} from "firebase-admin/storage"

import {
  getApp,
  makeFirebaseCollection,
  makeFirebaseFilestorage,
  userConverter,
} from "@/lib/db/firebase-helper"
import { config } from "@/lib/util/config"
import { UserData } from "@/types/db"

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
  ...makeFirebaseCollection(_user),
  async append(id, data) {},
  async queryFirst(param, op, value) {
    return {} as any
  },
}

export const fileStorage = makeFirebaseFilestorage(storageBucket)
