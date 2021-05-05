export interface IUserProfileDAC {
  setProfile(content: IUserProfile): Promise<IDACResponse>;
  setPreferences(data: IUserPreferences): Promise<IDACResponse>;
  // getProfile(userId:string, options:IProfileOptions): Promise<any>;
  // getPreferences(data:any,options:IPreferencesOptions): Promise<IUserPreferences>;
  // getProfileHistory(data:any): Promise<any>;
  // getPreferencesHistory(data:any): Promise<any>;
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
export interface IHistoryLog
{
  updatedBy: string,
  timestamp: Date
}
export interface IProfileIndex {
  version: number;
  profile : IUserProfile;
  lastUpdatedBy: string;
  historyLog : IHistoryLog[];
}
export interface IPreferencesIndex {
  version: number;
  preferences : IUserPreferences;
  lastUpdatedBy: string;
  historyLog : IHistoryLog[];
}
export interface IProfileOptions{
  ipd?:string,
  skapp?:string
}
export interface IPreferencesOptions{
  skapp?:string
}
export interface IUserPreferences{
  version: number;
  darkmode:boolean;
  portal:string;
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
}