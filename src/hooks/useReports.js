import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { DEFAULT_REPORT_FIELDS, REPORT_FIELD_DEFS } from '../config/reportFields.js'

export function useReports() {
  const [reportRows, setReportRows] = useState([])
  const [reportFieldKeys, setReportFieldKeys] = useState(DEFAULT_REPORT_FIELDS)

  const loadReportFieldSettings = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'report_fields').maybeSingle()
    const keys = Array.isArray(data?.value) ? data.value.filter((k) => REPORT_FIELD_DEFS.some((f) => f.key === k)) : []
    setReportFieldKeys(keys.length ? keys : DEFAULT_REPORT_FIELDS)
  }, [])

  const loadReports = useCallback(async () => {
    await loadReportFieldSettings()
    const { data } = await supabase.from('v_session_report').select('*').order('session_date', { ascending: false }).limit(500)
    setReportRows(data || [])
  }, [loadReportFieldSettings])

  useEffect(() => { loadReports() }, [loadReports])

  const saveReportFields = useCallback(async (chosenKeys) => {
    const ordered = DEFAULT_REPORT_FIELDS.filter((k) => chosenKeys.includes(k))
    const { error } = await supabase.from('app_settings').upsert({ key: 'report_fields', value: ordered })
    if (!error) setReportFieldKeys(ordered)
    return { error }
  }, [])

  const updateSession = useCallback(async (id, patch) => {
    const { error } = await supabase.from('sessions').update(patch).eq('id', id)
    if (!error) setReportRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    return { error }
  }, [])

  const deleteSession = useCallback(async (id) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (!error) await loadReports()
    return { error }
  }, [loadReports])

  const addCustomField = useCallback(async (row, label, value) => {
    const updated = (Array.isArray(row.custom_fields) ? row.custom_fields : []).concat([{ label, value }])
    return updateSession(row.id, { custom_fields: updated })
  }, [updateSession])

  const removeCustomField = useCallback(async (row, idx) => {
    const updated = (Array.isArray(row.custom_fields) ? row.custom_fields : []).slice()
    updated.splice(idx, 1)
    return updateSession(row.id, { custom_fields: updated })
  }, [updateSession])

  return { reportRows, reportFieldKeys, saveReportFields, updateSession, deleteSession, addCustomField, removeCustomField, refresh: loadReports }
}
