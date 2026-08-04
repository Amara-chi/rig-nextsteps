import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { fmtTime } from '../lib/format.js'
import EmptyState from './EmptyState.jsx'

function NoteItem({ note, canManage, onChanged }) {
  const toast = useAppToast()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.note)

  const when = new Date(note.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + fmtTime(note.created_at)

  const save = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const { error } = await supabase.from('person_notes').update({ note: trimmed }).eq('id', note.id)
    if (error) { toast("Couldn't save — check your access."); return }
    setEditing(false)
    onChanged()
  }

  const del = async () => {
    const { error } = await supabase.from('person_notes').delete().eq('id', note.id)
    if (error) { toast("Couldn't delete that note."); return }
    onChanged()
  }

  return (
    <div className="flex gap-2.5 py-2.25 px-3 rounded-xl bg-white border border-line mb-1.75 items-start">
      {editing ? (
        <div className="flex-1">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} className="w-full min-h-14 rounded-[9px] border-[1.5px] border-line py-2 px-2.5 text-[12.5px] font-sans resize-y" />
          <div className="flex gap-1.5 mt-1.5">
            <button type="button" onClick={save} className="py-1.5 px-3 rounded-lg text-[11.5px] font-bold bg-orange text-white">Save</button>
            <button type="button" onClick={() => { setText(note.note); setEditing(false) }} className="py-1.5 px-3 rounded-lg text-[11.5px] font-bold bg-cream-deep text-ink-deep">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <div className="text-[12.5px] text-ink-deep leading-[1.5]">{note.note}</div>
          <div className="font-mono text-[9.5px] text-muted-label mt-0.75">{note.profiles?.full_name || 'Team member'} · {when}</div>
        </div>
      )}
      {canManage && !editing && (
        <div className="flex gap-0.5 flex-none">
          <button type="button" title="Edit note" onClick={() => setEditing(true)} className="text-muted-icon text-xs leading-none py-0.75 px-1.25 rounded-md hover:text-orange-deep hover:bg-orange-soft">✎</button>
          <button type="button" title="Delete note" onClick={del} className="text-muted-icon text-[15px] leading-none py-0.5 px-1 rounded-md hover:text-orange-deep hover:bg-orange-soft">✕</button>
        </div>
      )}
    </div>
  )
}

// className overrides the wrapper's top margin — the old app's default
// .notes-wrap was margin-top:16px (mt-4), but the Support pages' stacked
// fu-item layout used an inline override to 10px (mt-2.5) instead. showLabel
// is false on the Support pages too — their notes-wrap never had the "nk"
// header, unlike the People pane's person-detail usage.
export default function NotesThread({ personId, className = 'mt-4', showLabel = true }) {
  const me = useMe()
  const toast = useAppToast()
  const [notes, setNotes] = useState(null)
  const [input, setInput] = useState('')

  const load = async () => {
    const { data, error } = await supabase
      .from('person_notes')
      .select('id, note, created_at, author_id, profiles(full_name)')
      .eq('person_id', personId)
      .order('created_at', { ascending: false })
    setNotes(error ? [] : (data || []))
  }
  useEffect(() => { load() }, [personId])

  const addNote = async () => {
    const text = input.trim()
    if (!text) return
    const { error } = await supabase.from('person_notes').insert({ person_id: personId, author_id: me.id, note: text })
    if (error) { toast("Couldn't save the note — check your access."); return }
    setInput('')
    toast('Note added — visible to all staff.')
    load()
  }

  return (
    <div className={`${className} border-t border-dashed border-line pt-3`}>
      {showLabel && <div className="font-mono text-[9px] tracking-[.1em] uppercase text-muted-label font-semibold mb-2">Notes for staff — action points, prayer points, for the house church leader</div>}
      {notes === null ? (
        <EmptyState>Loading notes…</EmptyState>
      ) : notes.length === 0 ? (
        <EmptyState>No notes yet — be the first.</EmptyState>
      ) : (
        notes.map((n) => (
          <NoteItem key={n.id} note={n} canManage={me?.role === 'director' || n.author_id === me?.id} onChanged={load} />
        ))
      )}
      <div className="flex gap-2 mt-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addNote() }}
          maxLength={500}
          placeholder="Add a note — every staff member can see it…"
          className="flex-1 py-2.5 px-3 border-[1.5px] border-line rounded-xl text-[13px]"
        />
        <button type="button" onClick={addNote} className="py-2.25 px-4 rounded-[10px] font-bold text-[12.5px] bg-orange text-white whitespace-nowrap">Add note</button>
      </div>
    </div>
  )
}
