import { SkynetClient, MySky, JsonData } from "skynet-js";
import { ChildHandshake, Connection, WindowMessenger } from "post-me";
import { IUserProfile, EntryType, IDACResponse, IUserPreferences, IUserProfileDAC, IFilePaths, IProfileOptions, IPreferencesOptions, IHistoryLog, IProfileIndex, IPreferencesIndex } from "./types";

const DATA_DOMAIN = "skyuser.hns";

const urlParams = new URLSearchParams(window.location.search);
const DEBUG_ENABLED = urlParams.get('debug') === "true";
const DEV_ENABLED = urlParams.get('dev') === "true";
const VERSION = 1;

export default class UserProfileDAC implements IUserProfileDAC {
  protected connection: Promise<Connection>;
  private client: SkynetClient
  private mySky: MySky;
  private paths: IFilePaths;
  private skapp: string;

  public constructor() {
    // create client
    this.client = new SkynetClient();

    // define API
    const methods = {
      init: this.init.bind(this),
      onUserLogin: this.onUserLogin.bind(this),
      // getProfile: this.getProfile.bind(this),
      // getProfileHistory: this.getProfileHistory.bind(this),
      // getPreferences: this.getPreferences.bind(this),
      // getPreferencesHistory: this.getPreferencesHistory.bind(this),
      setProfile: this.setProfile.bind(this),
      setPreferences: this.setPreferences.bind(this),
    };

    // create connection
    this.connection = ChildHandshake(
      new WindowMessenger({
        localWindow: window,
        remoteWindow: window.parent,
        remoteOrigin: "*",
      }),
      methods,
    );
  }

  //Initialize DAC
  public async init() {
    try {
      // extract the skappname and use it to set the filepaths
      const hostname = new URL(document.referrer).hostname
      const skapp = await this.client.extractDomain(hostname)
      this.log("loaded from hostname", hostname)
      this.log("loaded from skapp", skapp)
      this.skapp = skapp;

      this.paths = {
        PREFERENCES_PATH: `${DATA_DOMAIN}/${skapp}/preferences.json`,
        PROFILE_PATH: `${DATA_DOMAIN}/${skapp}/userprofile.json`,
        PROFILE_INDEX_PATH: `${DATA_DOMAIN}/profileIndex.json`,
        PREFERENCES_INDEX_PATH: `${DATA_DOMAIN}/preferencesIndex.json`
      }

      // load mysky
      const opts = { dev: DEV_ENABLED }
      this.mySky = await this.client.loadMySky(DATA_DOMAIN, opts)
    } catch (error) {
      this.log('Failed to load MySky, err: ', error)
      throw error;
    }
  }

  /**
   * This method is used to retrive last saved users profile information globaly. accross all skapps using this dac
   * @param userId need to pass a dummy data for remotemethod call sample {test:"test"}
   * @param options need to pass {ipd:"SkyId"} for skyId profiles
   * @returns Promise<any> the last saved users profile data
   */
  // public async getProfile(userId: string, options: IProfileOptions): Promise<any> {
  //   try {
  //     // check if we need to pull "SkyID" (legancy login) profile
  //     if (options != null && options != undefined && options.ipd == "SkyId") {
  //       this.log('Got SkyId params checking SkyID');
  //       // get "Skapp" name which updated profile last.
  //       let oldData: any = await this.client.db.getJSON(userId, "profile")
  //       let userProfile: IUserProfile = {
  //         version: VERSION,
  //         username: oldData.username,
  //         aboutMe: oldData.aboutMe,
  //         location: oldData.location || "",
  //         topics: oldData.tags || [],
  //         avatar: oldData.avatar || []
  //       }
  //       return userProfile;
  //     }
  //     else { // By default get "MySky" Profile
  //       let lastSkapp = null;
  //       if (options && options?.skapp) {
  //         lastSkapp = options?.skapp;
  //       }
  //       else {
  //         // get "Skapp" name which updated profile last. 
  //         lastSkapp = await this.getLastestProfileSkapp();
  //       }
  //       // null mean profile is not initilaized correctly. 
  //       // Ideally this shouldn't happen, since we are initializing empty profile  at first MySky login
  //       if (lastSkapp != null) {
  //         // download profile json from Skapp folder and return
  //         const LATEST_PROFILE_PATH = `${DATA_DOMAIN}/${lastSkapp}/userprofile.json`;
  //         return await this.downloadFile(LATEST_PROFILE_PATH);
  //       }
  //       else {// return empty profile
  //         return this.getInitialProfile();
  //       }
  //     }
  //   } catch (error) {
  //     this.log('Error occurred trying to get profile data, err: ', error);
  //     return { error: error }
  //   }
  // }
  /**
   * This method is used to retrive last saved users Preferences information globaly. accross all skapps using this dac
   * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
   * @returns Promise<any> the last saved users Preferences data
   */
  // public async getPreferences(data: any, options: IPreferencesOptions): Promise<any> {
  //   try {
  //     let lastSkapp = null;
  //     if (options && options?.skapp) {
  //       lastSkapp = options?.skapp;
  //     }
  //     else {
  //       // get "Skapp" name which updated preference last.
  //       lastSkapp = await this.handleGetLastestPrefSkapp();
  //     }
  //     // null mean profile is not initilaized correctly. 
  //     // Ideally this shouldn't happen, since we are initializing empty preference at first MySky login
  //     if (lastSkapp != null) {
  //       // download preferece json from Skapp folder and return
  //       const LATEST_PREF_PATH = `${DATA_DOMAIN}/${lastSkapp}/preferences.json`;
  //       return await this.downloadFile(LATEST_PREF_PATH);
  //     }
  //     else {
  //       return this.getInitialPrefrences();
  //     }
  //   } catch (error) {
  //     this.log('Error occurred trying to record new content, err: ', error)
  //     return { error: error }
  //   }
  // }

  /**
 * This method is used to retrive users profile information update History. accross all skapps using this dac
 * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
 * @returns Promise<any> the profile data update history
 */
  // public async getProfileHistory(data: any): Promise<any> {
  //   try {
  //     // purposefully not awaited
  //     let indexData: any = await this.downloadFile(this.paths.PROFILE_INDEX_PATH);
  //     return indexData.historyLog;
  //   } catch (error) {
  //     this.log('Error occurred trying to record new content, err: ', error)
  //     return { error: error }
  //   }
  // }

  /**
* This method is used to retrive users Preferences information update History. accross all skapps using this dac
* @param data need to pass a dummy data for remotemethod call sample {test:"test"}
* @returns Promise<any> the Preferences data update history
*/
  // public async getPreferencesHistory(data: any): Promise<any> {
  //   try {
  //     // purposefully not awaited
  //     let indexData: any = await this.downloadFile(this.paths.PREFERENCES_INDEX_PATH);
  //     return indexData.historyLog;
  //   } catch (error) {
  //     this.log('Error occurred trying to record new content, err: ', error)
  //     return { error: error }
  //   }

  // }
  // onUserLogin is called by MySky when the user has logged in successfully
  public async onUserLogin() {
    // Ensure file hierarchy will ensure the index and current page file for
    // both entry types get precreated. This should alleviate a very slow
    // `getJSON` timeout on inserting the first entry.
    this.ensureProfilePresent()
      .then(() => { this.log('Successfully ensured Profile Present') })
      .catch(err => { this.log('Failed to ensure Profile Present, err: ', err) })
    this.ensurePreferencesPresent()
      .then(() => { this.log('Successfully ensured Preferences Present') })
      .catch(err => { this.log('Failed to ensure Preferences Present, err: ', err) })
  }
  // ensureFileHierarchy ensures that for every entry type its current index and
  // page file exist, this ensures we do not take the hit for it when the user
  // interacts with the DAC, seeing as non existing file requests time out only
  // after a certain amount of time.
  private async ensureProfilePresent(): Promise<void> {
    const { PROFILE_INDEX_PATH } = this.paths;
    let profileIndex = await this.downloadFile(PROFILE_INDEX_PATH);
    // Check if Index files are Initalized, if not create empty files
    if (profileIndex == '' || profileIndex == null || profileIndex == undefined) {
      this.updateFile(PROFILE_INDEX_PATH, this.getInitialProfileIndex())
    }
  }
  private async ensurePreferencesPresent(): Promise<void> {
    const { PREFERENCES_INDEX_PATH } = this.paths;
    let preferenceIndex = await this.downloadFile(PREFERENCES_INDEX_PATH);
    // Check if Index files are Initalized, if not create empty files
    if (preferenceIndex == '' || preferenceIndex == null || preferenceIndex == undefined) {
      this.updateFile(PREFERENCES_INDEX_PATH, this.getInitialPrefrencesIndex())
    }
  }
  // Only set Methods needs to be in DAC
  public async setProfile(data: IUserProfile): Promise<IDACResponse> {
    try {
      await this.updateFile(this.paths.PROFILE_PATH, data)
      this.setProfileIndex(EntryType.PROFILE, data)
    } catch (error) {
      this.log('Error occurred trying to record new content, err: ', error)
    }
    return { submitted: true }
  }
  public async setPreferences(data: IUserPreferences): Promise<IDACResponse> {
    try {
      await this.updateFile(this.paths.PREFERENCES_PATH, data)
      this.setPreferencesIndex(EntryType.PREFERENCES, data)
    } catch (error) {
      this.log('Error occurred trying to record new content, err: ', error)
    }
    return { submitted: true }
  }

  private async setProfileIndex(kind: EntryType, data: IUserProfile) {
    let indexRecord : IProfileIndex|null = null;
    let updateLog : IHistoryLog = {
      updatedBy: this.skapp,
      timestamp: new Date()
    }
    indexRecord = await this.downloadFile(this.paths.PROFILE_INDEX_PATH);
    if (indexRecord == null || indexRecord == undefined) {
      indexRecord = this.getInitialProfileIndex();
    }
    indexRecord.lastUpdatedBy = this.skapp;
    indexRecord.profile = data;
    if (indexRecord.historyLog == null) {
      indexRecord.historyLog = []
    }
    indexRecord.historyLog.push(updateLog);
    this.updateFile(this.paths.PROFILE_INDEX_PATH, indexRecord)
  }

  private async setPreferencesIndex(kind: EntryType, data: IUserPreferences) {
    let indexRecord : IPreferencesIndex|null = null;
    let updateLog : IHistoryLog = {
      updatedBy: this.skapp,
      timestamp: new Date()
    }
    indexRecord = await this.downloadFile(this.paths.PREFERENCES_INDEX_PATH);
    if (indexRecord == null || indexRecord == undefined) {
      indexRecord = this.getInitialPrefrencesIndex();
    }
    indexRecord.lastUpdatedBy = this.skapp;
    indexRecord.preferences = data;
    if (indexRecord.historyLog == null) {
      indexRecord.historyLog = []
    }
    indexRecord.historyLog.push(updateLog);
    this.updateFile(this.paths.PREFERENCES_INDEX_PATH, indexRecord)
  }

  // private async getLastestProfileSkapp(): Promise<string | null> {
  //   let indexData: any = await this.downloadFile(this.paths.PROFILE_INDEX_PATH);
  //   if (indexData != null) {
  //     return indexData.lastUpdatedBy;
  //   } else {
  //     return null;
  //   }
  // }

  // private async handleGetLastestPrefSkapp(): Promise<string | null> {
  //   let indexData: any = await this.downloadFile(this.paths.PREFERENCES_INDEX_PATH);
  //   if (indexData != null) {
  //     return indexData.lastUpdatedBy;
  //   } else {
  //     return null
  //   }
  // }

  // downloadFile merely wraps getJSON but is typed in a way that avoids
  // repeating the awkward "as unknown as T" everywhere
  private async downloadFile<T>(path: string): Promise<T | null> {
    this.log('downloading file at path', path)
    const { data } = await this.mySky.getJSON(path)
    if (!data) {
      this.log('no data found at path', path)
      return null;
    }
    this.log('data found at path', path, data)
    return data as unknown as T
  }

  // updateFile merely wraps setJSON but is typed in a way that avoids repeating
  // the awkwars "as unknown as JsonData" everywhere
  private async updateFile<T>(path: string, data: T) {
    this.log('updating file at path', path, data)
    await this.mySky.setJSON(path, data as unknown as JsonData)
  }

  private getInitialProfile() {
    return {
      version: VERSION,
      username: "",
      aboutMe: "",
      location: "",
      topics: [],
      avatar: []
    }
  }
  private getInitialPrefrences() {
    return {
      version: VERSION,
      darkmode: false,
      portal: "https://siasky.net"
    }
  }
  private getInitialProfileIndex() {
    let initialProfile = this.getInitialProfile();
    return {
      version: VERSION,
      profile: initialProfile,
      lastUpdatedBy: this.skapp,
      historyLog: []
    }
  }
  private getInitialPrefrencesIndex() {
    let initialPrefrences = this.getInitialPrefrences();
    return {
      version: VERSION,
      preferences: initialPrefrences,
      lastUpdatedBy: this.skapp,
      historyLog: []
    }
  }
  // log prints to stdout only if DEBUG_ENABLED flag is set
  private log(message: string, ...optionalContext: any[]) {
    if (DEBUG_ENABLED) {
      console.log(message, ...optionalContext)
    }
  }
}
