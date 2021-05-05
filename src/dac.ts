import { ChildHandshake, Connection, WindowMessenger } from "post-me";
import { JsonData, MySky, SkynetClient } from "skynet-js";
import { IDACResponse, IFilePaths, IPreferencesIndex, IProfileIndex, IUserPreferences, IUserProfile, IUserProfileDAC } from "./types";
import { validateProfile } from "./utils";

export const VERSION = 1;

const DATA_DOMAIN = "skyuser.hns";

const urlParams = new URLSearchParams(window.location.search);
const DEBUG_ENABLED = urlParams.get('debug') === "true";
const DEV_ENABLED = urlParams.get('dev') === "true";

export default class UserProfileDAC implements IUserProfileDAC {
  protected connection: Promise<Connection>;

  private client: SkynetClient
  private mySky: MySky;
  private paths: IFilePaths;
  private skapp: string;
  private initialized: boolean;

  public constructor() {
    // create client
    this.client = new SkynetClient();

    // define API
    const methods = {
      init: this.init.bind(this),
      onUserLogin: this.onUserLogin.bind(this),
      setProfile: this.setProfile.bind(this),
      updateProfile: this.updateProfile.bind(this),
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
        PREFERENCES_INDEX_PATH: `${DATA_DOMAIN}/preferencesIndex.json`,
        PREFERENCES_PATH: `${DATA_DOMAIN}/${skapp}/preferences.json`,
        PROFILE_INDEX_PATH: `${DATA_DOMAIN}/profileIndex.json`,
        PROFILE_PATH: `${DATA_DOMAIN}/${skapp}/userprofile.json`,
      }

      // load mysky
      const opts = { dev: DEV_ENABLED }
      this.mySky = await this.client.loadMySky(DATA_DOMAIN, opts)
    } catch (error) {
      this.log('Failed to load MySky, err: ', error)
      throw error;
    }
  }

  // onUserLogin is called by MySky when the user has logged in successfully
  public async onUserLogin() {
    const promises = []

    promises.push(this.ensureProfilePresent()
      .then(() => { this.log('Successfully ensured Profile index') })
      .catch(err => { this.log('Failed to ensure Profile index, err: ', err) })
    )

    promises.push(this.ensurePreferencesPresent()
      .then(() => { this.log('Successfully ensured Preferences index') })
      .catch(err => { this.log('Failed to ensure Preferences index, err: ', err) }))
      
    Promise.all(promises).then(() => { this.initialized = true})
  }

  // Only set Methods needs to be in DAC
  public async setProfile(profile: IUserProfile): Promise<IDACResponse> {
    if (!await this.waitUntilInitialized()) {
      return this.fail('Could not set profile, initialization timeout');
    }

    try {
      validateProfile(profile)
      const { PROFILE_PATH: path } = this.paths;
      await this.updateFile(path, profile)
      await this.updateProfileIndex(profile) // TODO added await, ok?
    } catch (error) {
      return this.fail(`setProfile failed, err: ${error.message}`)
    }

    return { submitted: true }
  }

  public async updateProfile(profile: Partial<IUserProfile>): Promise<IDACResponse> {
    if (!await this.waitUntilInitialized()) {
      return this.fail('Could not set profile, initialization timeout');
    }

    let update: IUserProfile;

    try {
      const { PROFILE_PATH: path } = this.paths;
      const current = await this.downloadFile<IUserProfile>(path)
      update = current ? { ...current, ...profile } : profile as IUserProfile;
    } catch (error) {
      return this.fail(`updateProfile failed, err: ${error.message}`)
    }

    return await this.setProfile(update)
  }

  public async setPreferences(prefs: IUserPreferences): Promise<IDACResponse> {
    const initiliazed = await this.waitUntilInitialized()
    if (!initiliazed) {
      return this.fail('Could not set preferences, initialization timeout');
    }

    // TODO validate preferences

    try {
      const { PREFERENCES_PATH: path } = this.paths;
      await this.updateFile(path, prefs)
      this.updatePreferencesIndex(prefs)
    } catch (error) {
      this.log('Error occurred trying to record new content, err: ', error)
    }
    return { submitted: true }
  }

  // ensureProfilePresent ensures the profile index file exists.
  private async ensureProfilePresent(): Promise<void> {
    const { PROFILE_INDEX_PATH: path } = this.paths;
    const index = await this.downloadFile<IProfileIndex>(path);
    if (!index) {
      await this.updateFile(path, this.getInitialProfileIndex())
    }
  }

  // ensurePreferencesPresent ensures the preferences index file exists.
  private async ensurePreferencesPresent(): Promise<void> {
    const { PREFERENCES_INDEX_PATH: path } = this.paths;
    const index = await this.downloadFile<IPreferencesIndex>(path);
    if (!index) {
      await this.updateFile(path, this.getInitialPrefrencesIndex())
    }
  }

  private async updateProfileIndex(profile: IUserProfile) {
    const { PROFILE_INDEX_PATH: path } = this.paths;    
    const index = await this.downloadFile<IProfileIndex>(path);
    if (!index) {
      throw new Error('Profile index not found');
    }

    index.profile = profile;
    index.lastUpdatedBy = this.skapp;
    index.historyLog.push({
      updatedBy: this.skapp,
      timestamp: new Date()
    });

    await this.updateFile(path, index)
  }

  private async updatePreferencesIndex(prefs: IUserPreferences) {
    const { PREFERENCES_INDEX_PATH: path } = this.paths;
    const index = await this.downloadFile<IPreferencesIndex>(path);
    if (!index) {
      throw new Error('Preferences index not found');
    }

    index.preferences = prefs;
    index.lastUpdatedBy = this.skapp;
    index.historyLog.push({
      updatedBy: this.skapp,
      timestamp: new Date()
    });

    await this.updateFile(path, index)
  }

  private waitUntilInitialized(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.initialized) {
        resolve(true);
        return;
      }

      const start = new Date().getTime()
      while (true) {
        setTimeout(() => {
          if (this.initialized) {
            resolve(true);
          }
          const elapsed = new Date().getTime() - start;
          if (elapsed > 60000) {
            this.log(`waitUntilInitialized timed out after ${elapsed}ms`)
            reject(false)
          }
        }, 100)
      }
    })
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

  // fail is a helper function that logs the error and returns a dac response
  // that indicates failure
  private fail(error: string): IDACResponse {
    this.log(error)
    return { submitted: false, error}
  }

  // log prints to stdout only if DEBUG_ENABLED flag is set
  private log(message: string, ...optionalContext: any[]) {
    if (DEBUG_ENABLED) {
      console.log("UserProfileDAC :: "+message, ...optionalContext)
    }
  }
}
