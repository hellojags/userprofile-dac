import { IUserProfile } from "./types";

export function validateProfile(profile: IUserProfile) {
  const allowedKeys = [
    'version',
    'username',
    'aboutMe',
    'location',
    'topics',
    'avatar',
  ]

  const requiredKeys = [
    'version',
    'username',
  ]

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

  if (profile.aboutMe && typeof profile.aboutMe !== 'string') {
    throw new Error(`Profile key 'aboutMe' is not a string`)
  }

  if (profile.location && typeof profile.location !== 'string') {
    throw new Error(`Profile key 'location' is not a string`)
  }

  if (profile.topics) {
    for (const topic of profile.topics) {
      if (typeof topic !== 'string') {
        throw new Error(`Profile topic ${topic} is not a string`)
      }
    }
  }
}