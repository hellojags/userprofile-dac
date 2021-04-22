export interface IUserProfileDAC {
  
  setProfile(content: IUserProfile): Promise<IDACResponse>;
  getProfile(userId:string, options:IProfileOption): Promise<any>;
  setPreferance(data: IUserPreferance): Promise<IDACResponse>;
  getPreferance(data:any): Promise<IUserPreferance>
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
export interface IUserPreferance{
  darkmode:boolean;
  portal:string;
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
  INDEX_PREFERANCE: string;
}