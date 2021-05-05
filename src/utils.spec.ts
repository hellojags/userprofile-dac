import { DEFAULT_USER_PROFILE, IAvatar } from './types'
import { validateAvatar, validateProfile } from './utils'

// TODO: could/should be extended

describe('validateProfile', () => {
  it('should not throw on valid input', () => {
    expect(() => validateProfile(DEFAULT_USER_PROFILE)).not.toThrow()
  })

  it('should catch invalid version', () => {
    expect(() => validateProfile({version: 2, username: 'test'})).toThrowError()
  })

  it('should catch invalid username', () => {
    expect(() => validateProfile({version: 1, username: ''})).toThrowError()
  })

  it('should catch invalid avatar', () => {
    const invalidAvatar = { w: 1, h: 1, url: "url" } as IAvatar
    const invalidProfile = {...DEFAULT_USER_PROFILE, avatar: [invalidAvatar]}
    expect(() => validateProfile(invalidProfile)).toThrowError()
  })
})

describe('validateAvatar', () => {
  it('should not throw on valid input', () => {
    const avatar = { ext: "ext", w: 1, h: 0, url: "url" };
    expect(() => validateAvatar(avatar)).not.toThrow()
  })

  it('should catch missing fields', () => {
    let invalid = { w: 1, h: 1, url: "url" } as IAvatar
    expect(() => validateAvatar(invalid)).toThrow()
    invalid = { ext: "ext", h: 1, url: "url" } as IAvatar
    expect(() => validateAvatar(invalid)).toThrow()
  })

  it('should catch faulty types', () => {
    let invalid = { ext: "ext", w: "1", h: 1, url: "url" } as unknown as IAvatar
    expect(() => validateAvatar(invalid)).toThrow()
    invalid = { ext: "ext", h: 1, url: 0 } as unknown as IAvatar
    expect(() => validateAvatar(invalid)).toThrow()
  })
})