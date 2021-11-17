import { type } from "os";

export const VERSION = 1;
export interface IUserProfileDAC {
  setUserStatus(status: StatusType): Promise<IDACResponse>;
  // get method get method with UserId input parameter is in library

  setProfile(profile: IUserProfile): Promise<IDACResponse>;
  updateProfile(profile: Partial<IUserProfile>): Promise<IDACResponse>;
  // get method get method with UserId input parameter is in library

  setGlobalPreferences(prefs: IUserPreferences): Promise<IDACResponse>;
  getGlobalPreferences(): Promise<any>;

  //Skapp Preferences
  setPreferences(prefs: IUserPreferences): Promise<IDACResponse>;
  getSkappPreferences(): Promise<any>;
  // get method with UserId input parameter is in library
}

export const StatusType = {
  ONLINE: 'Online',
  IDLE: 'Idle',
  DO_NOT_DISTURB: 'Do Not Disturb',
  INVISIBLE: 'Invisible',
  NONE: 'None'
} as const;
export type StatusType = typeof StatusType[keyof typeof StatusType];

export const PrivacyType = {
  PRIVATE: 'Private',
  PUBLIC: 'Public'
} as const;
export type PrivacyType = typeof PrivacyType[keyof typeof PrivacyType];

export const LastSeenPrivacyType = {
  PRIVATE: 'Private',
  PUBLIC_TS: 'Public with Timestamp',
  PUBLIC_NO_TS: 'Public without Timestamp',
} as const;
export type LastSeenPrivacyType = typeof LastSeenPrivacyType[keyof typeof LastSeenPrivacyType];

export const UserPresenceType = {
  RECENTLY: 'Recently',
  YESTERDAY: 'Yesterday',
  WITHIN_A_WEEK: 'Within a week',
  WITHIN_A_MONTH: 'Within a month',
  LONG_TIME_AGO: 'Long time ago'
} as const;
export type UserPresenceType = typeof UserPresenceType[keyof typeof UserPresenceType];
export interface IUserStatus {
  status: StatusType; // 6 bits
  lastSeen: number; // 32 bits
}

// DEFAULT_USER_PROFILE defines all props as it is used in validator
export const DEFAULT_USER_PROFILE: IUserProfile = {
  version: VERSION,
  username: "anonymous",
  firstName: "",
  lastName: "",
  emailID: "",
  contact: "",
  aboutMe: "",
  location: "",
  topics: [],
  avatar: [{ "ext": "", "w": 0, "h": 0, "url": "" }],
  connections: []
}

export const DEFAULT_USER_STATUS = {
  status: StatusType.NONE, // 6 bits
  lastSeen: 0 // 32 bits
}

export const DEFAULT_PREFERENCES: IUserPreferences = {
  version: VERSION,
  darkmode: false,
  portal: "https://siasky.net/",
  userStatus: {
    statusPrivacy: "Private",
    lastSeenPrivacy: "Private",
    updatefrequency: 0
  }
}
export interface IUserProfile {
  version: number;
  username: string;
  firstName?: string;
  lastName?: string;
  emailID?: string;
  contact?: string;
  aboutMe?: string;
  location?: string;
  topics?: string[];
  avatar?: IAvatar[];
  connections?: any[];
}

export interface IAvatar {
  ext: string,
  w: number,
  h: number,
  url: string
}
export interface IHistoryLog {
  updatedBy: string,
  timestamp: Date
}
export interface IProfileIndex {
  version: number;
  profile: IUserProfile;
  lastUpdatedBy: string;
  historyLog: IHistoryLog[];
}
export interface IPreferencesIndex {
  version: number;
  preferences: IUserPreferences;
  lastUpdatedBy: string;
  skapps: string[];
  historyLog: IHistoryLog[];
}
export interface IProfileOptions {
  ipd?: string,
  skapp?: string
}
// export interface IUserStatusOptions {
//   skapp?: string,
//   onUserStatusChange?: () => IUserStatus;  
// }
export interface IPreferencesOptions {
  skapp?: string
}
export interface IUserPreferences {
  version: number;
  darkmode: boolean;
  portal: string;
  userStatus: IUserStatusPreferences | null; // skappName -> Privacy setting
  //more to be added in upcoming versions 
}
export interface IUserStatusPreferences {
  statusPrivacy: PrivacyType;
  lastSeenPrivacy: LastSeenPrivacyType;
  updatefrequency: number; // 1,5,10,15
  //more to be added in upcoming versions 
}

export interface IDACResponse {
  submitted: boolean;
  error?: string;
}

export enum EntryType {
  'PROFILE',
  'PREFERENCES',
}

export interface IUpdateFileOptions {
  encypted: boolean
}
// NOTE: the values contained by this interface are 'static', meaning they won't
// change after the DAC has initialized. That is why they are uppercased,
// because desctructured they will look like regular constants.
//
// e.g. const { NC_INDEX_PATH } = this.paths;
export interface IFilePaths {
  PREFERENCES_PATH: string;
  PROFILE_PATH: string;
  PROFILE_INDEX_PATH: string;
  PREFERENCES_INDEX_PATH: string;
  USER_STATUS_INDEX_PATH: string;
  USER_STATUS_PATH: string;
}