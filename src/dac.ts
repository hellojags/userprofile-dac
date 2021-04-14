import { Buffer } from "buffer"
import { SkynetClient, MySky, JsonData } from "skynet-js";
import { ChildHandshake, Connection, WindowMessenger } from "post-me";
import { IUserProfile, IIndex, IPage, IUserProfilePersistence, ICreateProfilePersistence, EntryType, IDACResponse, IDictionary, IUserProfileDAC, IFilePaths } from "./types";

// DAC consts
const DATA_DOMAIN = "skyuser.hns";

const urlParams = new URLSearchParams(window.location.search);
const DEBUG_ENABLED = urlParams.get('debug') === "true";
const DEV_ENABLED = urlParams.get('dev') === "true";

// page consts
const ENTRY_MAX_SIZE = 1 << 12; // 4kib
const PAGE_REF = '[NUM]';

// index consts
const INDEX_DEFAULT_PAGE_SIZE = 1000;
const INDEX_VERSION = 1;

// ContentRecordDAC is a DAC that allows recording user interactions with pieces
// of content. There are two types of interactions which are:
// - content creation
// - content interaction (can be anything)
//
// The DAC will store these interactions across a fanout data structure that
// consists of an index file that points to multiple page files.
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
  public async getProfile(data:any): Promise<any> {
    try { 
      // purposefully not awaited
      return this.handleGetProfile()
      
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
      return { error: error }
    }
    
  }
  public async createNewProfile(data: IUserProfile): Promise<IDACResponse> {
    try { 
      // purposefully not awaited
      this.handleNewEntries(EntryType.CREATEPROFILE, data)
      
    } catch(error) {
      this.log('Error occurred trying to record new content, err: ', error)
    }
    return { submitted: true }
  }
  public async updateProfile(data: IUserProfile): Promise<IDACResponse> {
    try { 
      // purposefully not awaited
      this.handleNewEntries(EntryType.UPDATEPROFILE, data)
      
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
      this.log("loaded from skapp", skapp)
      this.skapp = skapp;


      this.paths = {
        SKAPPS_DICT_PATH: `${DATA_DOMAIN}/skapps.json`,
        PROFILE_PATH: `${DATA_DOMAIN}/profile.json`,

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



  // handleNewEntries is called by both 'recordNewContent' and
  // 'recordInteraction' and handles the given entry accordingly.
  private async handleNewEntries(kind: EntryType, data: IUserProfile) {
    const { PROFILE_PATH } = this.paths;
      await Promise.all([
        this.updateFile(PROFILE_PATH, data)
      ]);
  }

  private async handleGetProfile() {
    const { PROFILE_PATH } = this.paths;
      return await this.downloadFile(PROFILE_PATH)
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

  // toPersistence turns content info into a content persistence object [Need to Impliment this]
  private toPersistence(data: IUserProfile): IUserProfilePersistence {
    const persistence = {
      timestamp: Math.floor(Date.now() / 1000),
      version: 1,
      ...data
    }
  // validate the given data does not exceed max size
    const size = Buffer.from(JSON.stringify(persistence)).length
    if (size > ENTRY_MAX_SIZE) {
      throw new Error(`Entry exceeds max size, ${length}>${ENTRY_MAX_SIZE}`)
    }
    return persistence;
  }
  // log prints to stdout only if DEBUG_ENABLED flag is set
  private log(message: string, ...optionalContext: any[]) {
    if (DEBUG_ENABLED) {
      console.log(message, ...optionalContext)
    }
  }
}
