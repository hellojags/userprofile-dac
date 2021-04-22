export interface IUserProfileDAC {
  
  setProfile(content: IUserProfile): Promise<IDACResponse>;
  getProfile(userId:string, options:IProfileOption): Promise<any>;
  setPreference(data: IUserPreference): Promise<IDACResponse>;
  getPreference(data:any): Promise<IUserPreference>;
  getProfileHistory(data:any): Promise<any>;
  getPreferenceHistory(data:any): Promise<any>;
}

export interface IProfileOption{
  ipd:string
}
export interface IUserProfile { 
  username: string,
  aboutMe?: string,
  location?: string,
  topics?: string[],
  avatar?: any[]
}
export interface IUserPreference{
  darkmode:boolean;
  portal:string;
  //more to be added in upcoming versions 
}


export interface IUserProfilePersistence {
  timestamp: number;  // unix timestamp of recording
  version: number;
}

export interface IDACResponse {
  submitted: boolean;
  error?: string;
}


export enum EntryType {
  'CREATEPROFILE',
  'UPDATEPROFILE',
  'UPDATEPREF'
}

// NOTE: the values contained by this interface are 'static', meaning they won't
// change after the DAC has initialized. That is why they are uppercased,
// because desctructured they will look like regular constants.
//
// e.g. const { NC_INDEX_PATH } = this.paths;
export interface IFilePaths {
  PREF_PATH: string;
  PROFILE_PATH: string;
  INDEX_PROFILE: string;
  INDEX_PREFERENCE: string;
}