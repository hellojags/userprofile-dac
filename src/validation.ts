import { VERSION } from "./types";
import { DEFAULT_USER_PROFILE, IAvatar, IUserProfile, DEFAULT_PREFERENCES, IUserPreferences, IPreferencesIndex} from "./types";

export function validateProfile(profile: IUserProfile) {
  const allowedKeys = Object.keys(DEFAULT_USER_PROFILE)

  const requiredKeys = [
    'version',
    'username',
  ]

  // check version
  if (profile.version !== VERSION) {
    throw new Error(`Profile version is invalid, '${VERSION}' is the only allowed version`)
  }

  // check keys
  for (const key of Object.keys(profile)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Profile key '${key}' is not allowed according to the schema.`)
    }
  }
  for (const key of requiredKeys) {
    if (!Object.keys(profile).includes(key)) {
      throw new Error(`Profile key '${key}' is missing.`)
    }
  }

  if (profile.username === "") {
    throw new Error(`Profile key 'username' can not be an empty string.`)
  }

  // check types
  const expectedStrings = [
    'username',
    'firstName',
    'lastName',
    'emailID',
    'contact',
    'aboutMe',
    'location',
  ]
  for (const key of expectedStrings) {
    validateString(key, (profile as unknown as Record<string, unknown>)[key])
  }
  if (profile.topics) {
    for (const topic of profile.topics) {
      validateString('topic', topic)
    }
  }

  // check avatars
  if (profile.avatar) {
    for (const avatar of profile.avatar) {
      validateAvatar(avatar)
    }
  }
}

export function validateAvatar(avatar: IAvatar) {
  const allowedKeys = ["ext", "w", "h", "url"]
  const requiredKeys = allowedKeys

  // check keys
  for (const key of Object.keys(avatar)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Avatar key '${key}' is not allowed according to the schema.`)
    }
  }
  for (const key of requiredKeys) {
    if (!Object.keys(avatar).includes(key)) {
      throw new Error(`Avatar key '${key}' is missing.`)
    }
  }

  // check strings
  const expectedStrings = ['ext', 'url']
  for (const key of expectedStrings) {
    validateString(key, (avatar as unknown as Record<string, unknown>)[key])
  }

  // check numbers
  const expectedNumbers = ['w', 'h']
  for (const key of expectedNumbers) {
    validateNumber(key, (avatar as unknown as Record<string, unknown>)[key])
  }
}

export function validatePreferences(preference: IUserPreferences) {
  const allowedKeys = Object.keys(DEFAULT_PREFERENCES)

  const requiredKeys = [
    'version',
  ]

  // check version
  if (preference.version !== VERSION) {
    throw new Error(`Profile version is invalid, '${VERSION}' is the only allowed version`)
  }

  // check keys
  for (const key of Object.keys(preference)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`User Preferences key '${key}' is not allowed according to the schema.`)
    }
  }
  for (const key of requiredKeys) {
    if (!Object.keys(preference).includes(key)) {
      throw new Error(`User Preferences key '${key}' is missing.`)
    }
  }

  // if (profile.username === "") {
  //   throw new Error(`Profile key 'username' can not be an empty string.`)
  // }

  // check types
  const expectedStrings = [
    'username',
    'firstName',
    'lastName',
    'emailID',
    'contact',
    'aboutMe',
    'location',
  ]
  // for (const key of expectedStrings) {
  //   validateString(key, (profile as unknown as Record<string, unknown>)[key])
  // }
  // if (profile.topics) {
  //   for (const topic of profile.topics) {
  //     validateString('topic', topic)
  //   }
  // }

  // // check avatars
  // if (profile.avatar) {
  //   for (const avatar of profile.avatar) {
  //     validateAvatar(avatar)
  //   }
  // }
}

export function validateString(name: string, input: unknown) {
  if (input !== undefined && typeof input !== 'string') {
    throw new Error(`Given value ${input} for '${name}' is not a string`)
  }
}

export function validateNumber(name: string, input?: unknown) {
  if (input !== undefined && typeof input !== 'number') {
    throw new Error(`Given value ${input} for '${name}' is not a number`)
  }
}
