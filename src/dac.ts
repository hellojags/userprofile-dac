import { SkynetClient, MySky, JsonData } from "skynet-js";
import { ChildHandshake, Connection, WindowMessenger } from "post-me";
import { IUserProfile, EntryType, IDACResponse,IUserPreference, IUserProfileDAC, IFilePaths, IProfileOption } from "./types";

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
      setProfile: this.setProfile.bind(this),
      getProfile: this.getProfile.bind(this),
      getProfileHistory: this.getProfileHistory.bind(this),
      setPreference: this.setPreference.bind(this),
      getPreference: this.getPreference.bind(this),
      getPreferenceHistory: this.getPreferenceHistory.bind(this),
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
   * @param userId need to pass a dummy data for remotemethod call sample {test:"test"}
   * @param options need to pass {ipd:"SkyId"} for skyId profiles
   * @returns Promise<any> the last saved users profile data
   */
  public async getProfile(userId:string,options:IProfileOption): Promise<any> {
    try { 
      return this.handleGetProfile()
    } catch(error) {
      this.log('Error occurred trying to get profile data, err: ', error)
      
      if(options!=null && options != undefined && options.ipd =="SkyId"){
        this.log('Got SkyId params checking SkyID');
        let oldData:any=await this.client.db.getJSON(userId,"profile")
        let userProfile: IUserProfile ={
          username: oldData.username,
          aboutMe: oldData.aboutMe,
          location: oldData.location || "",
          topics: oldData.tags || [],
          avatar: oldData.avatar || []
        }
        this.log('Updating DAC User Profile')
        this.handleProfileUpdate(userProfile);
        return { error: error }
       }else{
      
      return { error: error }
       }
    } 
  }
  /**
   * This method is used to retrive last saved users Preference information globaly. accross all skapps using this dac
   * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
   * @returns Promise<any> the last saved users Preference data
   */
  public async getPreference(data:any): Promise<any> {
    try { 
      return this.handleGetPreference() 
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
      return this.handleGetProfileHistory();
      
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
      return { error: error }
    }
    
  }

      /**
   * This method is used to retrive users Preference information update History. accross all skapps using this dac
   * @param data need to pass a dummy data for remotemethod call sample {test:"test"}
   * @returns Promise<any> the Preference data update history
   */
  public async getPreferenceHistory(data:any): Promise<any> {
    try { 
      // purposefully not awaited
      return this.handleGetPreferenceHistory();
      
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
      return { error: error }
    }
    
  }

  public async setProfile(data: IUserProfile): Promise<IDACResponse> {
    try { 
      this.handleProfileUpdate(data);
      this.handleNewEntries(EntryType.UPDATEPROFILE, data)
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
    }
    return { submitted: true }
  }

  
  public async setPreference(data: IUserPreference): Promise<IDACResponse> {
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
        PROFILE_PATH: `${DATA_DOMAIN}/${skapp}/user-profile.json`,
        INDEX_PROFILE: `${DATA_DOMAIN}/index_profile.json`,
        INDEX_PREFERENCE: `${DATA_DOMAIN}/index_preference.json`
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

private getBlankIndex(){
  return      {
    profile:'',
    preference:'',
    profilehistory:[],
    prefhistory:[]
  
  }
}

  private async handleNewEntries(kind: EntryType, data: IUserProfile|IUserPreference) {
    const { INDEX_PROFILE,INDEX_PREFERENCE } = this.paths;
    let indexRecord:any = {} 

    let updateLog = {
      updatedBy:this.skapp,
      timestamp: new Date()
    }
      switch(kind){
        case EntryType.CREATEPROFILE:
        case EntryType.UPDATEPROFILE:
          indexRecord= await this.handleGetIndex("PROFILE");
          if(indexRecord==null || indexRecord == undefined ){
            indexRecord = this.getBlankIndex();
          }
          indexRecord.profile=this.skapp;
          if(indexRecord.profilehistory==null){
            indexRecord.profilehistory=[]
          }
          indexRecord.profilehistory.push(updateLog);
          this.updateFile(INDEX_PROFILE, indexRecord)
          break;
        case EntryType.UPDATEPREF:
          indexRecord= await this.handleGetIndex("PREFERENCE");
    if(indexRecord==null || indexRecord == undefined ){
      indexRecord =this. getBlankIndex();    
    }
          indexRecord.preference=this.skapp;
          if(indexRecord.prefhistory==null){
            indexRecord.prefhistory=[]
          }
          indexRecord.prefhistory.push(updateLog);
          this.updateFile(INDEX_PREFERENCE, indexRecord)
          break;
        default:
          this.log('No case found for kind ',kind);
      }

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
    let lastSkapp =new String( await this.handleGetLastestProfileSkapp());
    if(lastSkapp=='' ||lastSkapp == null ||lastSkapp == undefined){
      return this.getBlankIndex();
    }else{
    const LATEST_PROFILE_PATH =`${DATA_DOMAIN}/${lastSkapp}/user-profile.json`;
      return await this.downloadFile(LATEST_PROFILE_PATH);
    }
  }

  private async handleGetPreference() { 
    let lastSkapp = await this.handleGetLastestPrefSkapp();
    if(lastSkapp=='' ||lastSkapp == null ||lastSkapp == undefined){
      return this.getBlankIndex();
    }else{
    const LATEST_PREF_PATH =`${DATA_DOMAIN}/${lastSkapp}/global-preference.json`;
      return await this.downloadFile(LATEST_PREF_PATH);
    }
  }

  private async handleGetIndex(kind:string) {
    const { INDEX_PROFILE,INDEX_PREFERENCE } = this.paths;
    let indexData:any ={}
    switch(kind){
      case "PROFILE":
        indexData=await this.downloadFile(INDEX_PROFILE);
        break;
      case "PREFERENCE":
        indexData=await this.downloadFile(INDEX_PREFERENCE);
        break;

    } 
      return indexData;
  }

  private async handleGetLastestProfileSkapp():Promise<string> {
    const { INDEX_PROFILE } = this.paths;
      let indexData:any = await this.downloadFile(INDEX_PROFILE);
      if(indexData!=null){
      return indexData.profile;
      }else{
        return ''
      }

  }
  private async handleGetLastestPrefSkapp():Promise<string> {
    const { INDEX_PREFERENCE } = this.paths;
      let indexData:any = await this.downloadFile(INDEX_PREFERENCE);
      if(indexData!=null){
        return indexData.preference;
        }else{
          return ''
        }
  }

  private async handleGetPreferenceHistory() {
      let indexData:any = await this.handleGetIndex("PREFERENCE");
      return indexData.prefhistory;
  }
  private async handleGetProfileHistory() {
    let indexData:any = await this.handleGetIndex("PROFILE");
    return indexData.profilehistory;
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
