import { Buffer } from "buffer"
import { SkynetClient, MySky, JsonData } from "skynet-js";
import { ChildHandshake, Connection, WindowMessenger } from "post-me";
import { IUserProfile, EntryType, IDACResponse, IUserProfileDAC, IFilePaths } from "./types";

// DAC consts
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

  public constructor(
  ) {
    // create client
    this.client = new SkynetClient();

    // define API
    const methods = {
      init: this.init.bind(this),
      onUserLogin: this.onUserLogin.bind(this),
      createNewProfile: this.createNewProfile.bind(this),
      updateProfile: this.updateProfile.bind(this),
      getProfile: this.getProfile.bind(this),
      getProfileHistory: this.getProfileHistory.bind(this),
      updatePreferance: this.updatePreferance.bind(this),
      getPreferance: this.getPreferance.bind(this),
      getPrefHistory: this.getPrefHistory.bind(this),
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

  /**
   * This method is used to retrive last saved users profile information globaly. accross all skapps using this dac
   * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
   * @returns Promise<any> the last saved users profile data
   */
  public async getProfile(data:any): Promise<any> {
    try { 
      return this.handleGetProfile()
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
      return { error: error }
    } 
  }
  /**
   * This method is used to retrive last saved users preferance information globaly. accross all skapps using this dac
   * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
   * @returns Promise<any> the last saved users preferance data
   */
  public async getPreferance(data:any): Promise<any> {
    try { 
      return this.handleGetPreferance() 
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
      return { error: error }
    } 
  }

  /**
   * This method is used to save users preferance information globaly. accross all skapps using this dac
   * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
   * @returns Promise<any> success /error status
   */
  public async setPreferance(data:any): Promise<any> {
    try { 
      // purposefully not awaited
      return this.handleGetProfile();
      
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
      return { error: error }
    } 
  }

    /**
   * This method is used to retrive users profile information update History. accross all skapps using this dac
   * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
   * @returns Promise<any> the profile data update history
   */
  public async getProfileHistory(data:any): Promise<any> {
    try { 
      // purposefully not awaited
      return this.handleGetPreferanceHistory();
      
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
      return { error: error }
    }
    
  }

      /**
   * This method is used to retrive users preferance information update History. accross all skapps using this dac
   * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
   * @returns Promise<any> the preferance data update history
   */
  public async getPrefHistory(data:any): Promise<any> {
    try { 
      // purposefully not awaited
      return this.handleGetPreferanceHistory();
      
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
      return { error: error }
    }
    
  }
  public async createNewProfile(data: IUserProfile): Promise<IDACResponse> {
    try { 
      this.handleProfileUpdate(data);
      this.handleNewEntries(EntryType.CREATEPROFILE, data) 
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
    }
    return { submitted: true }
  }
  public async updateProfile(data: IUserProfile): Promise<IDACResponse> {
    try { 
      this.handleProfileUpdate(data);
      this.handleNewEntries(EntryType.UPDATEPROFILE, data)
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
    }
    return { submitted: true }
  }

  
  public async updatePreferance(data: IUserProfile): Promise<IDACResponse> {
    try { 
      this.handlePrefUpdate(data);
      this.handleNewEntries(EntryType.UPDATEPREF, data)
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
    }
    return { submitted: true }
  }



  public async init() {
    try {
      // extract the skappname and use it to set the filepaths
      const hostname = new URL(document.referrer).hostname
      const skapp = await this.client.extractDomain(hostname)
      this.log("loaded from hostname", hostname)
      this.log("loaded from skapp", skapp)
      this.skapp = skapp;


      this.paths = {
        PREF_PATH: `${DATA_DOMAIN}/${skapp}/global-preference.json`,
        PROFILE_PATH: `${DATA_DOMAIN}/user-profile.json`,
        INDEX: `${DATA_DOMAIN}/index.json`
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
    // Ensure file hierarchy will ensure the index and current page file for
    // both entry types get precreated. This should alleviate a very slow
    // `getJSON` timeout on inserting the first entry.
    this.ensureProfilePresent()
      .then(() => { this.log('Successfully ensured Profile Present') })
      .catch(err => { this.log('Failed to ensure Profile Present, err: ', err) })

  }



  private async handleNewEntries(kind: EntryType, data: IUserProfile) {
    const { INDEX } = this.paths;
    let indexRecord:any = this.handleGetIndex();
    if(indexRecord!=null && indexRecord != undefined && indexRecord.history != null && indexRecord.history != undefined){
      indexRecord ={
      profile:'',
      preferance:'',
      profilehistory:[],
      prefhistory:[]
      }
    
    }

    let updateLog = {
      updatedBy:this.skapp,
      timestamp: new Date()
    }
      switch(kind){
        case EntryType.CREATEPROFILE:
        case EntryType.UPDATEPROFILE:
          indexRecord.profile=this.skapp;
          indexRecord.profilehistory.push(updateLog);
          break;
        case EntryType.UPDATEPREF:
          indexRecord.preferance=this.skapp;
          indexRecord.prefhistory.push(updateLog);
          break;
        default:
          this.log('No case found for kind ',kind);
      }
      await Promise.all([
        this.updateFile(INDEX, indexRecord),
      ]);
  }

  private async handleProfileUpdate(data:any){
    const { PROFILE_PATH } = this.paths;
    await this.updateFile(PROFILE_PATH, data)
  }

  private async handlePrefUpdate(data:any){
    const { PREF_PATH } = this.paths;
    await this.updateFile(PREF_PATH, data)
  }

  private async handleGetProfile() { 
    let lastSkapp = this.handleGetLastestProfileSkapp();
    const LATEST_PROFILE_PATH =`${DATA_DOMAIN}/${lastSkapp}/user-profile.json`;
      return await this.downloadFile(LATEST_PROFILE_PATH);
  }

  private async handleGetPreferance() { 
    let lastSkapp = this.handleGetLastestPrefSkapp();
    const LATEST_PREF_PATH =`${DATA_DOMAIN}/${lastSkapp}/user-profile.json`;
      return await this.downloadFile(LATEST_PREF_PATH);
  }

  private async handleGetIndex() {
    const { INDEX } = this.paths;
      let indexData:any = await this.downloadFile(INDEX);
      return indexData.profilehistory;
  }

  private async handleGetLastestProfileSkapp():Promise<string> {
    const { INDEX } = this.paths;
      let indexData:any = await this.downloadFile(INDEX);
      return indexData.profile;
  }
  private async handleGetLastestPrefSkapp():Promise<string> {
    const { INDEX } = this.paths;
      let indexData:any = await this.downloadFile(INDEX);
      return indexData.preferance;
  }

  private async handleGetPreferanceHistory() {
    const { INDEX } = this.paths;
      let indexData:any = await this.downloadFile(INDEX);
      return indexData.prefhistory;
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

  // ensureFileHierarchy ensures that for every entry type its current index and
  // page file exist, this ensures we do not take the hit for it when the user
  // interacts with the DAC, seeing as non existing file requests time out only
  // after a certain amount of time.
  private async ensureProfilePresent(): Promise<void> {
    const { PROFILE_PATH } = this.paths;
      await this.downloadFile(PROFILE_PATH)
  }

  // log prints to stdout only if DEBUG_ENABLED flag is set
  private log(message: string, ...optionalContext: any[]) {
    if (DEBUG_ENABLED) {
      console.log(message, ...optionalContext)
    }
  }
}
