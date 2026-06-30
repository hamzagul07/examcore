export type { Board, CommunityNote } from '@/lib/community/notes-types'
export { listNotes, getNote } from '@/lib/community/notes-read'
export {
  createNote,
  type CreateNoteInput,
  type CreateNoteResult,
} from '@/lib/community/notes-write'
