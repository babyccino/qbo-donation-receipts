import nodeCrypto from "node:crypto"

const _crypto = nodeCrypto.webcrypto as unknown as typeof crypto
export default _crypto
