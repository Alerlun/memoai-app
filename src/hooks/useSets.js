import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.jsx'

export function useSets() {
  const { user } = useAuth()
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSets = useCallback(async () => {
    if (!user) { setSets([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('study_sets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setSets(data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchSets() }, [fetchSets])

  async function addSet(setData) {
    const { data, error } = await supabase
      .from('study_sets')
      .insert({ ...setData, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    setSets(prev => [data, ...prev])
    return data
  }

  async function deleteSet(id) {
    await supabase.from('study_sets').delete().eq('id', id).eq('user_id', user.id)
    setSets(prev => prev.filter(s => s.id !== id))
  }

  // Called after Learn mode — saves updated spaced repetition data + progress
  async function updateProgress(id, progress, updatedCards) {
    const updates = { progress }
    if (updatedCards) updates.flashcards = updatedCards
    const { data, error } = await supabase
      .from('study_sets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (!error && data) setSets(prev => prev.map(s => s.id === id ? data : s))
  }

  async function updateSet(id, updates) {
    const { data, error } = await supabase
      .from('study_sets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) { console.error('[updateSet] Supabase error:', error.message); return }
    if (data) setSets(prev => prev.map(s => s.id === id ? data : s))
  }

  return { sets, loading, addSet, deleteSet, updateProgress, updateSet, refetch: fetchSets }
}
