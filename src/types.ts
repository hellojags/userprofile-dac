export interface IUserProfileDAC {
  createNewProfile(content: IUserProfile): Promise<IDACResponse>;
  updateProfile(content: IUserProfile): Promise<IDACResponse>;
  getProfile(data:any): Promise<any>;
}

export interface IUserProfile { 
  username: string,
  aboutme?: string,
  location?: string,
  preferance?:any,
  tags?: any[],
  avatar?: any[]
}

export interface IUserProfilePersistence {
  timestamp: number;  // unix timestamp of recording
  version: number;
}

export interface ICreateProfilePersistence extends IUserProfilePersistence { }
export interface IUpdateProfilePersistence extends IUserProfilePersistence { }

export interface IIndex {
  version: number;

  currPageNumber: number;
  currPageNumEntries: number;

  pages: string[];
  pageSize: number;
}

export interface IPage<IEntry> {
  version: number;

  indexPath: string; // back reference to the index
  pagePath: string; // back reference to the path

  entries: IEntry[];
}

export interface IDictionary {
  [key:string]: boolean
}
export interface IDACResponse {
  submitted: boolean;
  error?: string;
}

export enum EntryType {
  'CREATEPROFILE',
  'UPDATEPROFILE'
}

// NOTE: the values contained by this interface are 'static', meaning they won't
// change after the DAC has initialized. That is why they are uppercased,
// because desctructured they will look like regular constants.
//
// e.g. const { NC_INDEX_PATH } = this.paths;
export interface IFilePaths {
  PROFILE_HISTORY_PATH: string;
  PROFILE_PATH: string;
}