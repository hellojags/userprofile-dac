import { ChildHandshake, Connection, WindowMessenger } from "post-me";
import { JsonData, MySky, SkynetClient } from "skynet-js";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_USER_PROFILE,
  DEFAULT_USER_STATUS,
  IDACResponse,
  IFilePaths,
  IPreferencesIndex,
  IProfileIndex,
  IUserPreferences,
  IUserProfile,
  IProfileOptions,
  IUserProfileDAC,
  IPreferencesOptions,
  VERSION,
  StatusType,
  PrivacyType,
  IUserStatus,
  IUpdateFileOptions,
  LastSeenPrivacyType
} from "./types";
import { validateProfile } from "./validation";
import { Buffer } from "buffer";
const DATA_DOMAIN = "profile-dac.hns";
//const DATA_DOMAIN = "support-dac.hns";

const urlParams = new URLSearchParams(window.location.search);
const DEBUG_ENABLED = urlParams.get('debug') === "true";
const DEV_ENABLED = urlParams.get('dev') === "true";

export default class UserProfileDAC implements IUserProfileDAC {
  protected connection: Promise<Connection>;

  private client: SkynetClient
  private mySky: MySky;
  private paths: IFilePaths;
  private skapp: string;
  // will be flipped to true if all files are created
  private fileHierarchyEnsured: boolean;
  private globalPreferences: IPreferencesIndex | null;
  private skappPreferences: IUserPreferences | null;

  public constructor() {
    // create client
    this.client = new SkynetClient();

    // define API
    const methods = {
      init: this.init.bind(this),
      onUserLogin: this.onUserLogin.bind(this),
      setUserStatus: this.setUserStatus.bind(this),
      setProfile: this.setProfile.bind(this),
      updateProfile: this.updateProfile.bind(this),
      setGlobalPreferences: this.setGlobalPreferences.bind(this),
      getGlobalPreferences: this.getGlobalPreferences.bind(this),
      setPreferences: this.setPreferences.bind(this),
      getSkappPreferences: this.getSkappPreferences.bind(this),
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
        PREFERENCES_INDEX_PATH: `${DATA_DOMAIN}/preferencesIndex.json`,
        PREFERENCES_PATH: `${DATA_DOMAIN}/${skapp}/preferences.json`,
        PROFILE_INDEX_PATH: `${DATA_DOMAIN}/profileIndex.json`,
        PROFILE_PATH: `${DATA_DOMAIN}/${skapp}/userprofile.json`,
        USER_STATUS_INDEX_PATH: `${DATA_DOMAIN}/userstatus`,
        USER_STATUS_PATH: `${DATA_DOMAIN}/${skapp}/userstatus`
      }
      // load mysky
      const opts = { dev: DEV_ENABLED }
      this.mySky = await this.client.loadMySky(DATA_DOMAIN, opts);
      // get latest preferences and update cache
      setInterval(async () => {
        this.log(' >>>> Fetch GlobalPreferences Every 5 Minutes');
        this.globalPreferences = await this.getGlobalPreferences();
        //this.log(' End : populateGlobalPreferencesInCache() ');
      }, 300000)
      setInterval(async () => {
        this.log(` >>>> Fetch Skapp(${skapp}) Preferences : Every 5 Minutes`);
        // Get skapp preferences
        this.skappPreferences = await this.getSkappPreferences();
        //this.log(' End : populateSkappPreferencesInCache() ');
      }, 300000);
      // update lastSeen
      setInterval(async () => {
        this.log(' >>>> update lastSeen Every 2 Minute');
        // Get UserStatus
        const skappUserStatus: IUserStatus = await this.getSkappUserStatus();
        await this.setUserStatus(skappUserStatus.status)
        this.log(' End : update lastSeen ');
      }, 120000);
    } catch (error) {
      this.fail(`Failed to load MySky, err:  ${error}`)
      throw error;
    }
  }
  // onUserLogin is called by MySky when the user has logged in successfully
  public async onUserLogin() {
    try {
      const promises = []
      promises.push(this.ensureProfilePresent()
        .then(() => { this.log('Successfully ensured Profile index') })
        .catch(err => { this.fail(`Failed to ensure Profile index, err: ${err}`) })
      )
      promises.push(this.ensurePreferencesPresent()
        .then(() => { this.log('Successfully ensured Preferences index') })
        .catch(err => { this.fail(`Failed to ensure Preferences index, err:  ${err}`) }))

      Promise.all(promises).then(() => {
        this.fileHierarchyEnsured = true;
        const resultPromise = this.setUserStatus(StatusType.ONLINE)
          .then(() => { this.log(' User status updated Successfully to Online') })
          .catch(err => { this.fail(`Failed to ensure Preferences index, err:  ${err}`) });
        Promise.resolve(resultPromise);
      })
      //this.refreshCache();
    }
    catch (error: any) {
      return this.fail(`Could not initialization : Error ${error.message}`);
    }
  }
  //global user status is at Skynet level
  public async getGlobalUserStatus(): Promise<IUserStatus | any> {
    if (typeof this.client === "undefined") {
      throw Error('userprofile-library: SkynetClient not initialized')
    }
    try {
      let status: string | null = null;
      const { USER_STATUS_INDEX_PATH: pathIndex } = this.paths;
      status = await this.getEntryData(pathIndex);
      return this.parseUserStatusEntryData(status);
    } catch (error) {
      this.log('Error occurred trying to get user status, err: ', error);
      return { error: error }
    }
  }
  //Skapp user status is at specific to Skapp
  public async getSkappUserStatus(): Promise<IUserStatus | any> {
    if (typeof this.client === "undefined") {
      throw Error('userprofile-library: SkynetClient not initialized')
    }
    try {
      let status: string | null = null;
      const { USER_STATUS_PATH: path } = this.paths;
      status = await this.getEntryData(path);
      return this.parseUserStatusEntryData(status);
    } catch (error) {
      this.log('Error occurred trying to get user status, err: ', error);
      return { error: error }
    }
  }
  private parseUserStatusEntryData(data: string | null): IUserStatus {
    const userStatus: IUserStatus = {
      status: "None",
      lastSeen: 0,
    }
    if (data) {
      const dataList = data.split("|");
      userStatus.status = dataList[0] as any;
      userStatus.lastSeen = dataList[1] as any;
    }
    return userStatus;
  }

  public async setUserStatus(status: StatusType): Promise<IDACResponse> {
    try {
      if (!await this.waitUntilFilesArePresent()) {
        return this.fail('Could not set UserStatus, initialization timeout');
      }
      const { USER_STATUS_INDEX_PATH: pathIndex } = this.paths;
      const { USER_STATUS_PATH: path } = this.paths;
      // TODO: validate status value. Must be <= 70 characters
      // validateProfileStatus(status)
      let globalUserStatusPrivacy: PrivacyType = PrivacyType.PRIVATE;
      let globalUserStatuslastSeenPrivacy: LastSeenPrivacyType = PrivacyType.PRIVATE;
      let skappUserStatusPrivacy: PrivacyType = PrivacyType.PRIVATE;
      let skappUserStatuslastSeenPrivacy: LastSeenPrivacyType = PrivacyType.PRIVATE;
      if (this.globalPreferences && this.globalPreferences.preferences && this.globalPreferences.preferences.userStatus) {
        globalUserStatusPrivacy = this.globalPreferences.preferences.userStatus.statusPrivacy;
        globalUserStatuslastSeenPrivacy = this.globalPreferences.preferences.userStatus.lastSeenPrivacy;
      }
      if (this.skappPreferences && this.skappPreferences.userStatus) {
        skappUserStatusPrivacy = this.skappPreferences.userStatus.statusPrivacy;
        skappUserStatuslastSeenPrivacy = this.skappPreferences.userStatus.lastSeenPrivacy;
      }
      // if global privacy is public
      if (globalUserStatusPrivacy === PrivacyType.PUBLIC) {
        // update GLOBAL lastSeen value
        let userStatus: IUserStatus = DEFAULT_USER_STATUS;
        userStatus.lastSeen = globalUserStatuslastSeenPrivacy == LastSeenPrivacyType.PUBLIC_TS ? new Date().getTime() : 0;
        const globalUserStatusEntryData: string = this.prepareGlobalUserStatusEntryData(userStatus, false);
        await this.setEntryData(pathIndex, globalUserStatusEntryData);
       // if skapp privacy is public
        if (skappUserStatusPrivacy === PrivacyType.PUBLIC) {
          // set user's Skapp specific status
          const userStatus: IUserStatus = {
            status: status,
            lastSeen: skappUserStatuslastSeenPrivacy == LastSeenPrivacyType.PUBLIC_TS ? new Date().getTime() : 0, // 32 bits
          }
          const skappUserStatusEntryData: string = this.prepareUserStatusEntryData(userStatus, false);
          await this.setEntryData(path, skappUserStatusEntryData);
        }
        else{
          // if Skapp userstatus preference is "not public" set value to "None|0"
          let userStatus: IUserStatus = DEFAULT_USER_STATUS;
          const skappUserStatusEntryData: string = this.prepareUserStatusEntryData(userStatus, false);
          await this.setEntryData(path, skappUserStatusEntryData);
        }
      }
      else {
        // if global userstatus preference is "not public" set value to "None|0"
        let userStatus: IUserStatus = DEFAULT_USER_STATUS;
        const globalUserStatusEntryData: string = this.prepareGlobalUserStatusEntryData(userStatus, false);
        await this.setEntryData(pathIndex, globalUserStatusEntryData);
      }
    } catch (error: any) {
      return this.fail(`setUserStatus failed, err: ${error.message}`)
    }
    return { submitted: true }
  }
  private prepareGlobalUserStatusEntryData(userStatus: IUserStatus, encrypted: boolean): string {
    if (!encrypted) {
      return StatusType.NONE + "|" + userStatus.lastSeen;
    }
    else {
      // TODO implement encypted. Also, need to figureout how to share status with selected userIds
      return `${StatusType.NONE}|0`;
    }
  }
  private prepareUserStatusEntryData(userStatus: IUserStatus, encrypted: boolean): string {
    if (!encrypted) {
      return userStatus.status + "|" + userStatus.lastSeen;
    }
    else {
      // TODO implement encypted. Also, need to figureout how to share status with selected userIds
      return `${StatusType.NONE}|0`;
    }
  }

  // Only set Methods needs to be in DAC
  public async setProfile(profile: IUserProfile): Promise<IDACResponse> {
    if (!await this.waitUntilFilesArePresent()) {
      return this.fail('Could not set profile, initialization timeout');
    }

    try {
      validateProfile(profile)
      const { PROFILE_PATH: path } = this.paths;
      await this.updateFile(path, profile, { encypted: false })
      await this.updateProfileIndex(profile) // TODO added await, ok?
    } catch (error: any) {
      return this.fail(`setProfile failed, err: ${error.message}`)
    }

    return { submitted: true }
  }

  public async updateProfile(profile: Partial<IUserProfile>): Promise<IDACResponse> {
    if (!await this.waitUntilFilesArePresent()) {
      return this.fail('Could not set profile, initialization timeout');
    }

    let update: IUserProfile;

    try {
      const { PROFILE_PATH: path } = this.paths;
      const current = await this.downloadFile<IUserProfile>(path)
      update = current ? { ...current, ...profile } : profile as IUserProfile;
      // make sure we have not overwritten the original avatars
      if (current && current.avatar && update.avatar) {
        update.avatar = [...current.avatar, ...update.avatar]
      }
    } catch (error: any) {
      return this.fail(`updateProfile failed, err: ${error.message}`)
    }

    return await this.setProfile(update)
  }

  //TODO: need to make sure none of the elements are deleted
  public async setGlobalPreferences(prefs: IUserPreferences): Promise<IDACResponse> {
    const initiliazed = await this.waitUntilFilesArePresent()
    if (!initiliazed) {
      return this.fail('Could not set preferences, initialization timeout');
    }
    // TODO validate preferences
    try {
      const updatedIndex = await this.updatePreferencesIndex(prefs)
      this.globalPreferences = updatedIndex;
    } catch (error) {
      this.fail(`Error occurred trying to record new content, err: ${error}`)
    }
    return { submitted: true }
  }

  //TODO: need to make sure none of the elements are deleted
  public async setPreferences(prefs: IUserPreferences): Promise<IDACResponse> {
    const initiliazed = await this.waitUntilFilesArePresent()
    if (!initiliazed) {
      return this.fail('Could not set preferences, initialization timeout');
    }
    // TODO validate preferences
    try {
      const { PREFERENCES_PATH: path } = this.paths;
      await this.updateFile(path, prefs, { encypted: false })
      this.skappPreferences = prefs;
    } catch (error) {
      this.fail(`Error occurred trying to record new content, err: ${error}`)
    }
    return { submitted: true }
  }

  // ensureProfilePresent ensures the profile index file exists.
  private async ensureProfilePresent(): Promise<void> {
    const { PROFILE_INDEX_PATH: path } = this.paths;
    const index = await this.downloadFile<IProfileIndex>(path);
    if (!index) {
      await this.updateFile(path, {
        version: VERSION,
        profile: DEFAULT_USER_PROFILE,
        lastUpdatedBy: this.skapp,
        historyLog: []
      }, { encypted: false }) // default index
    }
  }

  // ensurePreferencesPresent ensures the preferences index file exists.
  private async ensurePreferencesPresent(): Promise<void> {
    // ensureGLobalPreferences
    const { PREFERENCES_INDEX_PATH: path } = this.paths;
    const index = await this.downloadFile<IPreferencesIndex>(path);
    if (!index) {
      const defaultGlobalPreference = {
        version: VERSION,
        preferences: DEFAULT_PREFERENCES,
        lastUpdatedBy: this.skapp,
        historyLog: []
      };
      await this.updateFile(path, defaultGlobalPreference, { encypted: false }); // default preferences
      this.globalPreferences = defaultGlobalPreference;
    }
    this.globalPreferences = index;

    // ensureSkappPreferences
    const { PREFERENCES_PATH: skappPath } = this.paths;
    const skappPreferences = await this.downloadFile<IUserPreferences>(skappPath);
    this.log(">>>>>>> ensureSkappPreferences 1 <<<<<<< " + JSON.stringify(skappPreferences))
    if (!skappPreferences) {
      this.log(">>>>>>> ensureSkappPreferences 2(inside) <<<<<<< " + skappPreferences)
      await this.updateFile(skappPath, DEFAULT_PREFERENCES, { encypted: false }); // default preferences
      this.skappPreferences = DEFAULT_PREFERENCES;
    }
    this.skappPreferences = skappPreferences;
  }

  private async updateProfileIndex(profile: IUserProfile): Promise<any> {
    const { PROFILE_INDEX_PATH: path } = this.paths;
    const index = await this.downloadFile<IProfileIndex>(path);
    if (!index) {
      throw new Error('Profile index not found');
    }
    if (!index.historyLog) {
      index.historyLog = []
    }

    index.profile = profile;
    index.lastUpdatedBy = this.skapp;
    index.historyLog.push({
      updatedBy: this.skapp,
      timestamp: new Date()
    });

    await this.updateFile(path, index, { encypted: false })
  }

  private async updatePreferencesIndex(prefs: IUserPreferences): Promise<any> {
    const { PREFERENCES_INDEX_PATH: path } = this.paths;
    const index = await this.downloadFile<IPreferencesIndex>(path);
    if (!index) {
      throw new Error('Preferences index not found');
    }
    if (!index.historyLog) {
      index.historyLog = []
    }

    index.preferences = prefs;
    index.lastUpdatedBy = this.skapp;
    index.historyLog.push({
      updatedBy: this.skapp,
      timestamp: new Date()
    });

    await this.updateFile(path, index, { encypted: false })
    return index;
  }

  private waitUntilFilesArePresent(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.fileHierarchyEnsured) {
        resolve(true);
        return;
      }

      const start = new Date().getTime()
      while (true) {
        setTimeout(() => {
          if (this.fileHierarchyEnsured) {
            resolve(true);
          }
          const elapsed = new Date().getTime() - start;
          if (elapsed > 60000) {
            this.log(`waitUntilFilesArePresent timed out after ${elapsed}ms`)
            reject(false)
          }
        }, 100)
      }
    })
  }

  /**
  * This method is used to retrive last saved users Preferences information globaly. accross all skapps using this dac
  * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
  * @returns Promise<any> the last saved users Preferences data
  */
  public async getGlobalPreferences(): Promise<any> {
    if (typeof this.client === "undefined") {
      throw Error('userprofile-dac: SkynetClient not initialized')
    }
    try {
      const { PREFERENCES_INDEX_PATH: path } = this.paths;
      return await this.downloadFile(path);
    } catch (error) {
      this.log('Error occurred in getGlobalPreferences, err: ', error)
      return { error: error }
    }
  }

  /**
  * This method is used to retrive last saved users Preferences information globaly. accross all skapps using this dac
  * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
  * @returns Promise<any> the last saved users Preferences data
  */
  public async getSkappPreferences(): Promise<any> {
    if (typeof this.client === "undefined") {
      throw Error('userprofile-dac: SkynetClient not initialized')
    }
    try {
      const { PREFERENCES_PATH: path } = this.paths;
      return await this.downloadFile(path);
    } catch (error) {
      this.log('Error occurred in getSkappPreferences(), err: ', error)
      return { error: error }
    }
  }

  private async handleGetLastestPrefSkapp(): Promise<string | null> {
    const { PREFERENCES_INDEX_PATH: path } = this.paths;
    let indexData: any = await this.downloadFile(path);
    if (indexData != null) {
      return indexData.lastUpdatedBy;
    } else {
      return null
    }
  }
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
  private async setEntryData(path: string, data: string) {
    this.log('updating EntryData at path', path, data)
    const entrydata: Uint8Array = Uint8Array.from(Buffer.from(data, "utf-8"));
    this.log(' entrydata (Uint8Array) -  ', JSON.stringify(entrydata))
    try {
      const entryData = await this.mySky.setEntryData(path, entrydata, { allowDeletionEntryData: true });
      this.log('setEntryData --> ', JSON.stringify(entryData));
    }
    catch (e) {
      this.fail(` Error Setting Entry Data ${e}`)
      throw e;
    }
  }
  // updateFile merely wraps setJSON but is typed in a way that avoids repeating
  // the awkwars "as unknown as JsonData" everywhere
  private async getEntryData(path: string) {
    this.log('reading EntryData at path', path);
    //this.log('updating file at path(jsonString)', path, jsonString)
    try {
      const entryData = await this.mySky.getEntryData(path);
      if (entryData?.data) {
        this.log('getEntryData --> ', JSON.stringify(entryData));
        return Buffer.from(entryData?.data).toString("utf-8");
      }
      else
        return null;
    }
    catch (e) {
      this.fail(` Error Getting Entry Data ${e}`)
      return null;
      //throw e;
    }

  }

  // updateFile merely wraps setJSON but is typed in a way that avoids repeating
  // the awkwars "as unknown as JsonData" everywhere
  private async updateFile<T>(path: string, data: T, options: IUpdateFileOptions) {
    this.log('updating file at path', path, data)
    await this.mySky.setJSON(path, data as unknown as JsonData)
  }

  // fail is a helper function that logs the error and returns a dac response
  // that indicates failure
  private fail(error: string): IDACResponse {
    this.log(error)
    return { submitted: false, error }
  }

  // log prints to stdout only if DEBUG_ENABLED flag is set
  private log(message: string, ...optionalContext: any[]) {
    if (DEBUG_ENABLED) {
      console.log("UserProfileDAC :: " + message, ...optionalContext)
    }
  }
}
