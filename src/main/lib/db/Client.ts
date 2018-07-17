import PouchDB from './PouchDB'
import { Folder, FolderDocument, Note, NoteDocument } from './dataTypes'
import {
  getFolderId,
  getNoteId,
  normalizeFolderPath,
  getParentFolderPath
} from './helpers'

interface ClientOptions {
  adapter: 'memory' | 'indexeddb'
}

export default class Client {
  private db: PouchDB.Database
  public initialized: boolean
  public readonly name: string

  constructor (name: string, options?: ClientOptions) {
    const pouchDBOptions: PouchDB.Configuration.DatabaseConfiguration = {}
    if (options != null) {
      if (options.adapter != null) {
        pouchDBOptions.adapter = options.adapter
      }
    }

    this.db = new PouchDB(name, pouchDBOptions)
    this.initialized = false
    this.name = name
  }

  async init () {
    await this.putFolder('/')
    const allNotes = await this.db.allDocs<Note>({
      include_docs: true,
      startkey: 'note:',
      endkey: 'note:\ufff0'
    })
    const folderSet = allNotes.rows.reduce((set, row) => {
      const note = row.doc as NoteDocument
      if (!set.has(note.folder)) set.add(note.folder)
      return set
    }, new Set())

    await Promise.all([...folderSet].map(async folderPath => {
      return this.putFolder(folderPath)
    }))
  }

  async assertIfParentFolderExists (path: string) {
    if (path === '/') throw new Error('The given path is root path')
    const parentPath = getParentFolderPath(path)
    const folder = await this.getFolder(parentPath)

    if (folder == null) throw new Error('The parent folder does not exist.')
  }

  async putFolder (path: string, folder?: Partial<Folder>): Promise<FolderDocument> {
    path = normalizeFolderPath(path)
    const prevFolder = await this.getFolder(path)
    if (path !== '/') {
      await this.assertIfParentFolderExists(path)
    }
    if (prevFolder != null && folder == null) {
      return prevFolder
    }

    await this.db.put({
      createdAt: new Date(),
      ...prevFolder,
      _id: getFolderId(path),
      updatedAt: new Date(),
      ...folder
    })

    return this.getFolder(path) as Promise<FolderDocument>
  }

  async getFolder (path: string): Promise<FolderDocument | null> {
    let folder: FolderDocument
    try {
      folder = await this.db.get<Folder>(getFolderId(path))
    } catch (error) {
      switch (error.status) {
        case 404:
          return null
        default:
          throw error
      }
    }
    return folder
  }

  async removeFolder (path: string): Promise<void> {
    const folder = await this.getFolder(path)
    if (folder != null) await this.db.remove(folder)
    await this.removeNotesInFolder(path)
    await this.removeSubFolders(path)
  }

  async destroyDB (): Promise<void> {
    return this.db.destroy()
  }

  async putNote (id: string, note?: Partial<Note>): Promise<NoteDocument> {
    const currentNote = await this.getNote(id)

    if (note != null) {
      if (note.folder != null) {
        const folder = await this.getFolder(note.folder)
        if (folder == null) throw new Error('folder does not exist.')
      }
    }

    await this.db.put({
      createdAt: new Date(),
      title: '',
      content: '',
      folder: '/',
      tags: [],
      ...currentNote,
      _id: getNoteId(id),
      updatedAt: new Date(),
      ...note
    })
    const newNote = await this.getNote(id) as NoteDocument

    return newNote
  }

  async getNote (id: string): Promise<NoteDocument | null> {
    let note: NoteDocument
    try {
      note = await this.db.get<Note>(getNoteId(id))
    } catch (error) {
      switch (error.status) {
        case 404:
          return null
          break
        default:
          throw error
      }
    }
    return note
  }

  async removeNotesInFolder (path: string): Promise<void> {
    const { rows } = await this.db.allDocs<Note>({
      include_docs: true,
      startkey: 'note:',
      endkey: 'note:\ufff0'
    })

    const rowsToDelete = rows.filter(row => (row.doc as NoteDocument).folder === path)

    await Promise.all(rowsToDelete.map(row => this.db.remove((row.doc as NoteDocument))))
  }

  async removeSubFolders (path: string): Promise<void> {
    const { rows } = await this.db.allDocs<Note>({
      startkey: `folder:${path}/`,
      endkey: `folder:${path}/\ufff0`
    })

    await Promise.all(rows.map(row => {
      const [, ...pathArray] = row.id.split('folder:')
      return this.removeFolder(pathArray.join(''))
    }))
  }

  async removeNote (path: string): Promise<void> {
    const note = await this.getNote(path)
    if (note != null) await this.db.remove(note)
  }

  async getAllDocs () {
    return this.db.allDocs({
      include_docs: true
    })
  }
}
