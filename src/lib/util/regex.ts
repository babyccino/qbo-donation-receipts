export const regularCharactersRegexString = "^[a-zA-Z0-9\\-_\\s,'&@#;]+$"
export const htmlRegularCharactersRegexString = "[a-zA-Z0-9 \\-_,'&@#;]+"
export const charityRegistrationNumberRegexString = "^\\d{9}[A-Z]{2}\\d{4}$"
export const regularCharacterRegex = new RegExp(regularCharactersRegexString)
export const charityRegistrationNumberRegex = new RegExp(charityRegistrationNumberRegexString)
export const regularCharacterHelperText = "alphanumeric characters along with -_,'&@#;"
