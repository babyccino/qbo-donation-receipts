import { test, describe, expect } from "bun:test"

import { charityRegistrationNumberRegex, regularCharacterRegex } from "@/lib/util/regex"

describe("regularCharacterRegex", () => {
  test("returns true for valid strings", () => {
    expect(regularCharacterRegex.test("AlphaNumeric123")).toBe(true)
    expect(regularCharacterRegex.test("Special-Character")).toBe(true)
    expect(regularCharacterRegex.test("Space Separated")).toBe(true)
    expect(regularCharacterRegex.test("Comma,Separated")).toBe(true)
    expect(regularCharacterRegex.test("Ampersand&Character")).toBe(true)
    expect(regularCharacterRegex.test("Hash#Tag")).toBe(true)
    expect(regularCharacterRegex.test("Semicolon;Separated")).toBe(true)
    expect(regularCharacterRegex.test("Mixed@Characters")).toBe(true)
    expect(regularCharacterRegex.test("Combination-&@#")).toBe(true)
    expect(regularCharacterRegex.test("Testing with Spaces, @ and #")).toBe(true)
    expect(regularCharacterRegex.test("123 Fake St, Company-ave")).toBe(true)
  })

  test("returns false for invalid strings", () => {
    expect(regularCharacterRegex.test("Invalid*Character")).toBe(false)
    expect(regularCharacterRegex.test("Dot.Character")).toBe(false)
    expect(regularCharacterRegex.test("Parenthesis(NotAllowed)")).toBe(false)
    expect(regularCharacterRegex.test("Square[Bracket]")).toBe(false)
    expect(regularCharacterRegex.test("Curly{Braces}")).toBe(false)
    expect(regularCharacterRegex.test("Colon:NotAccepted")).toBe(false)
    expect(regularCharacterRegex.test("Backslash\\Character")).toBe(false)
    expect(regularCharacterRegex.test("Exclamation!Mark")).toBe(false)
    expect(regularCharacterRegex.test("Plus+Sign")).toBe(false)
    expect(regularCharacterRegex.test("Equal=Sign")).toBe(false)
  })
})

describe("charityRegistrationNumberRegex", () => {
  test("returns true for valid strings", () => {
    expect(charityRegistrationNumberRegex.test("123456789AB1234")).toBe(true)
    expect(charityRegistrationNumberRegex.test("987654321XY5678")).toBe(true)
    expect(charityRegistrationNumberRegex.test("555666777CD9999")).toBe(true)
    expect(charityRegistrationNumberRegex.test("111222333EF4444")).toBe(true)
  })

  test("returns false for invalid strings", () => {
    expect(charityRegistrationNumberRegex.test("12345678901234")).toBe(false)
    expect(charityRegistrationNumberRegex.test("ABCDEFGHIJKLMNO")).toBe(false)
    expect(charityRegistrationNumberRegex.test("987654321XY56789")).toBe(false)
    expect(charityRegistrationNumberRegex.test("ABCD123456789XYZ")).toBe(false)
  })
})
