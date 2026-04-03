// smartQuiz.js — Algorithmic study content generator. No AI API calls.

// ─── STOPWORDS ────────────────────────────────────────────────────────────────

const STOP_EN = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','shall','should','may','might','must','can','could','of',
  'in','on','at','to','for','from','by','with','about','into','through','during',
  'before','after','above','below','between','among','it','its','this','that','these',
  'those','and','but','or','nor','so','yet','both','either','neither','not','if',
  'when','where','which','who','whom','whose','what','how','why','as','than','then',
  'there','their','they','we','you','he','she','i','my','your','his','her','our',
  'us','me','him','them','all','each','every','some','any','no','such','same',
  'other','more','most','also','just','only','very','too','even','here','now','up',
  'out','because','while','although','however','therefore','thus','hence','including',
  'using','used','make','made','take','taken','given','known','called','over','under',
  'per','than','rather','whether','often','always','never','already','still','well',
])

const STOP_SV = new Set([
  'och','i','att','en','ett','det','som','på','är','av','för','med','till','den',
  'de','inte','om','men','var','har','vi','han','hon','sig','från','efter','under',
  'mot','vid','utan','kan','ska','detta','dessa','vilket','vilken','vilka','när',
  'där','hur','vad','vem','vars','alla','hela','bara','även','sedan','dock','samt',
  'eller','varje','sina','sitt','sin','dess','dem','deras','ni','man','nu','då',
  'här','upp','ner','in','ut','redan','alltid','aldrig','också','igen','sådana',
  'sådant','sådan','detta','dessa','detta','mer','mest','mycket','lite','ha','bli',
])

function stop(lang) { return lang === 'sv' ? STOP_SV : STOP_EN }

// ─── MARKDOWN STRIPPER ────────────────────────────────────────────────────────
// Removes markdown formatting so headers/bullets don't bleed into questions

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')           // # headings
    .replace(/\*\*(.+?)\*\*/gs, '$1')      // **bold**
    .replace(/\*(.+?)\*/gs, '$1')          // *italic*
    .replace(/^[\*\-\+]\s+/gm, '')         // bullet points
    .replace(/^\d+\.\s+/gm, '')            // numbered lists
    .replace(/`(.+?)`/g, '$1')             // `code`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')    // [links](url)
    .replace(/^>\s+/gm, '')                // > blockquotes
    .replace(/^-{3,}$/gm, '')              // --- horizontal rules
    .replace(/\|.*\|/g, '')                // | tables |
    .replace(/_{2,}/g, '')                 // __underline__
    .replace(/\n{3,}/g, '\n\n')            // collapse excess blank lines
    .trim()
}

// ─── CORE TEXT UTILITIES ─────────────────────────────────────────────────────

function splitSentences(text) {
  if (!text) return []
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\n{2,}/g, ' ¶ ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÅÄÖ"'])/)
    .flatMap(chunk => chunk.split(' ¶ '))
    .map(s => s.replace(/^[¶\s.!?]+/, '').trim())
    .filter(s => s.split(/\s+/).length >= 5 && s.length >= 25)
}

function wordList(text, lang) {
  const sw = stop(lang)
  return (text.toLowerCase().match(/[a-zåäö]{3,}/g) || []).filter(w => !sw.has(w))
}

function freq(text, lang) {
  const f = {}
  for (const w of wordList(text, lang)) f[w] = (f[w] || 0) + 1
  return f
}

function extractKeyTerms(text, lang, n = 20) {
  const sw = stop(lang)
  const f = freq(text, lang)

  const defRx = lang === 'sv'
    ? /([a-zåäö]{4,}(?:\s+[a-zåäö]{3,}){0,2})\s+(?:är|kallas|innebär|definieras|refererar|betyder)/gi
    : /([a-z]{4,}(?:\s+[a-z]{3,}){0,2})\s+(?:is|are|was|were|means|refers|defined|known|called|involves)/gi

  const boosts = {}
  let m
  while ((m = defRx.exec(text.toLowerCase())) !== null) {
    const t = m[1].trim()
    if (!sw.has(t) && t.length >= 4) boosts[t] = (boosts[t] || 0) + 4
  }

  const combined = { ...f }
  for (const [k, v] of Object.entries(boosts)) combined[k] = (combined[k] || 0) + v

  return Object.entries(combined)
    .filter(([w]) => w.length >= 4 && !sw.has(w) && !/^\d+$/.test(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1))
}

function extractDefinitions(text, lang) {
  const sentences = splitSentences(text)
  const sw = stop(lang)
  const seen = new Set()
  const defs = []

  const patterns = lang === 'sv' ? [
    /^([A-ZÅÄÖ][A-ZÅÄÖa-zåäö\s]{2,34}?)\s+(?:är|var)\s+(?:en|ett|den|det|en slags?)?\s*(.{20,})/,
    /^([A-ZÅÄÖ][A-ZÅÄÖa-zåäö\s]{2,34}?)\s+(?:kallas|definieras som|innebär|refererar till|betyder)\s+(.{20,})/i,
  ] : [
    /^([A-Z][a-zA-Z\s]{2,34}?)\s+(?:is|are|was|were)\s+(?:a|an|the)?\s*(.{20,})/,
    /^([A-Z][a-zA-Z\s]{2,34}?)\s+(?:refers to|means|involves|describes|represents)\s+(.{20,})/i,
    /^([A-Z][a-zA-Z\s]{2,34}?)\s+(?:is defined as|is known as|is called)\s+(.{20,})/i,
    /^The\s+([a-z][a-zA-Z\s]{2,34}?)\s+(?:is|are)\s+(?:a|an|the)?\s*(.{20,})/,
  ]

  for (const s of sentences) {
    if (s.length > 260) continue
    for (const pat of patterns) {
      const match = s.match(pat)
      if (!match) continue
      const term = match[1].trim()
      const words = term.toLowerCase().split(/\s+/)
      if (words.length > 5) continue
      if (words.every(w => sw.has(w))) continue
      const key = term.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      defs.push({ term, sentence: s })
      break
    }
  }
  return defs
}

function scoreSentences(sentences, keyTerms, lang) {
  const termSet = new Set(keyTerms.map(t => t.toLowerCase()))
  const sw = stop(lang)
  const total = sentences.length

  return sentences
    .map((sentence, idx) => {
      const words = (sentence.toLowerCase().match(/[a-zåäö]{3,}/g) || [])
      const content = words.filter(w => !sw.has(w))
      const hits = content.filter(w => termSet.has(w)).length
      const density = content.length > 0 ? hits / content.length : 0

      const score =
        density * 2 +
        (idx < 3 ? 0.4 : idx >= total - 3 ? 0.2 : 0) +
        (/\d/.test(sentence) ? 0.2 : 0) +
        (/\b(is|are|was|means|refers|defined|known as|involves)\b/i.test(sentence) ? 0.35 : 0) +
        (/\b(because|therefore|thus|causes|leads to|results in|hence|consequently)\b/i.test(sentence) ? 0.15 : 0) +
        (sentence.length >= 60 && sentence.length <= 220 ? 0.1 : 0)

      return { sentence, score, index: idx }
    })
    .sort((a, b) => b.score - a.score)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function clean(s) { return (s || '').replace(/\s+/g, ' ').trim() }

// ─── FALSIFICATION ────────────────────────────────────────────────────────────

function falsifySentence(sentence, keyTerms) {
  const numMatch = sentence.match(/\b(\d{2,})\b/)
  if (numMatch) {
    const n = parseInt(numMatch[1])
    const delta = n > 100 ? Math.round(n * 0.3) : n > 10 ? Math.round(n * 0.5) : 3
    return sentence.replace(numMatch[0], String(n + delta))
  }
  const termLower = keyTerms.map(t => t.toLowerCase())
  const words = sentence.split(/\s+/)
  const hitIdxs = []
  for (let i = 0; i < words.length; i++) {
    const c = words[i].toLowerCase().replace(/[^a-zåäö]/g, '')
    if (termLower.includes(c) && c.length >= 5) hitIdxs.push(i)
  }
  if (hitIdxs.length >= 2) {
    const nw = [...words]
    ;[nw[hitIdxs[0]], nw[hitIdxs[1]]] = [nw[hitIdxs[1]], nw[hitIdxs[0]]]
    return nw.join(' ')
  }
  if (hitIdxs.length === 1) {
    const idx = hitIdxs[0]
    const current = words[idx].toLowerCase().replace(/[^a-zåäö]/g, '')
    const replacement = keyTerms.find(t => t.toLowerCase() !== current && t.length >= 5)
    if (replacement) {
      const nw = [...words]
      nw[idx] = replacement
      return nw.join(' ')
    }
  }
  return null
}

// ─── EXPORTED FUNCTIONS ───────────────────────────────────────────────────────

export async function generateTitle(text, lang = 'en') {
  const clean_text = stripMarkdown(text)
  const sentences = splitSentences(clean_text)
  const first = clean(sentences[0] || '')
  const words = first.split(/\s+/).slice(0, 7).join(' ').replace(/[.!?,:;'"]+$/, '').trim()
  if (words.length >= 10) return words.slice(0, 55)
  const terms = extractKeyTerms(clean_text, lang, 5)
  return terms.slice(0, 4).join(', ').slice(0, 55) || (lang === 'sv' ? 'Mitt studiepaket' : 'My Study Set')
}

export async function generateFlashcards(text, lang = 'en') {
  const clean_text = stripMarkdown(text)
  const sentences = splitSentences(clean_text)
  const keyTerms = extractKeyTerms(clean_text, lang, 25)
  const definitions = extractDefinitions(clean_text, lang)
  const scored = scoreSentences(sentences, keyTerms, lang)
  const termSet = new Set(keyTerms.map(t => t.toLowerCase()))
  const used = new Set()
  const cards = []

  // 1. Definition cards: "What is X?" — highest quality, clear Q&A
  for (const def of definitions.slice(0, 7)) {
    if (cards.length >= 14) break
    const q = lang === 'sv' ? `Vad är ${def.term}?` : `What is ${def.term}?`
    cards.push({ q, a: clean(def.sentence) })
    used.add(def.sentence)
  }

  // 2. Comprehension cards: "What does the text say about X?"
  for (const { sentence } of scored) {
    if (cards.length >= 14) break
    if (used.has(sentence)) continue
    const kw = keyTerms.find(t => sentence.toLowerCase().includes(t.toLowerCase()))
    if (!kw) continue
    const q = lang === 'sv' ? `Vad säger texten om ${kw}?` : `What does the text say about ${kw}?`
    cards.push({ q, a: clean(sentence) })
    used.add(sentence)
  }

  // 3. Fill-in-the-blank from high-scoring sentences (for variety — only if needed)
  if (cards.length < 8) {
    for (const { sentence } of scored) {
      if (cards.length >= 12) break
      if (used.has(sentence)) continue
      const tokens = sentence.split(/(\s+)/)
      for (let i = 0; i < tokens.length; i++) {
        const raw = tokens[i]
        const cw = raw.toLowerCase().replace(/[^a-zåäö]/g, '')
        if (termSet.has(cw) && cw.length >= 5) {
          const word = raw.replace(/[.,;:!?'"]+$/, '')
          const blanked = [...tokens]
          blanked[i] = raw.replace(word, '______')
          const q = (lang === 'sv' ? 'Fyll i: ' : 'Fill in: ') + blanked.join('').trim()
          cards.push({ q, a: `${word}` })
          used.add(sentence)
          break
        }
      }
    }
  }

  // 4. Cause/effect cards
  const causePairs = lang === 'sv' ? [
    [/^(.{15,70}),?\s+(?:eftersom|på grund av|därför att)\s+(.{15,})/i,
      m => `Varför ${m[1].replace(/^[A-ZÅÄÖ]/, c => c.toLowerCase())}?`],
  ] : [
    [/^(.{15,70}),?\s+(?:because|since|as a result of)\s+(.{15,})/i,
      m => `Why ${m[1].replace(/^[A-Z]/, c => c.toLowerCase())}?`],
    [/^(.{15,60})\s+(?:leads to|causes|results in)\s+(.{15,})/i,
      m => `What does ${m[1].replace(/^[A-Z]/, c => c.toLowerCase())} lead to?`],
  ]

  for (const sentence of sentences) {
    if (cards.length >= 14) break
    if (used.has(sentence)) continue
    for (const [pat, qFn] of causePairs) {
      const match = sentence.match(pat)
      if (match) {
        cards.push({ q: qFn(match), a: clean(sentence) })
        used.add(sentence)
        break
      }
    }
  }

  if (cards.length < 2) {
    throw new Error(lang === 'sv'
      ? 'Lägg till mer detaljerad text för bättre resultat.'
      : 'Add more detailed text for better results.')
  }

  return cards.slice(0, 14).map((f, i) => ({
    id: i, q: f.q.trim(), a: f.a.trim(),
    interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: null, memoryScore: 0,
  }))
}

export async function generateQuiz(text, flashcards, lang = 'en') {
  const clean_text = stripMarkdown(text)
  const definitions = extractDefinitions(clean_text, lang)
  const keyTerms = extractKeyTerms(clean_text, lang, 30)
  const sentences = splitSentences(clean_text)
  const scored = scoreSentences(sentences, keyTerms, lang)
  const questions = []

  // 1. Definition MC: "What is X?" — correct = real definition, distractors = other definitions
  //    All options are from the same domain, making it genuinely challenging
  const sdefs = shuffle([...definitions])
  for (const def of sdefs) {
    if (questions.length >= 4) break
    const wrongs = sdefs.filter(d => d.term !== def.term)
    if (wrongs.length < 2) continue
    const correct = clean(def.sentence)
    const distractors = shuffle(wrongs).map(d => clean(d.sentence)).slice(0, 3)
    if (distractors.length < 2) continue
    const options = shuffle([correct, ...distractors.slice(0, 3)])
    questions.push({
      q: lang === 'sv' ? `Vad är ${def.term}?` : `What is ${def.term}?`,
      options,
      correct: options.indexOf(correct),
      explanation: correct,
      difficulty: questions.length === 0 ? 'easy' : 'medium',
    })
  }

  // 2. Flashcard Q→A MC: use the flashcard's question, other cards' answers as distractors
  //    Skip fill-in-the-blank flashcards — those don't make good MC
  const fcClean = (flashcards || []).filter(f => {
    const q = (f.q || '').toLowerCase()
    return !q.startsWith('fill in:') && !q.startsWith('fyll i:')
  })
  for (const card of shuffle([...fcClean])) {
    if (questions.length >= 7) break
    const others = fcClean.filter(f => f.id !== card.id)
    if (others.length < 3) continue
    const correctAnswer = clean(card.a)
    const distractors = shuffle(others).slice(0, 3).map(f => clean(f.a))
    if (distractors.includes(correctAnswer)) continue
    // Avoid questions that are too similar to ones already added
    if (questions.some(q => q.q === card.q)) continue
    const options = shuffle([correctAnswer, ...distractors])
    questions.push({
      q: card.q,
      options,
      correct: options.indexOf(correctAnswer),
      explanation: correctAnswer,
      difficulty: 'medium',
    })
  }

  // 3. True/False style as MC: "Which statement is true?" with one real sentence + 3 modified ones
  if (questions.length < 6) {
    const pool = scored.filter(({ sentence }) =>
      sentence.length >= 50 && sentence.length <= 180
    )
    for (const { sentence } of pool.slice(0, 4)) {
      if (questions.length >= 8) break
      const correct = clean(sentence)
      // Generate plausible-but-wrong alternatives by swapping key terms
      const alts = []
      const others = pool.filter(p => p.sentence !== sentence)
      for (const other of shuffle(others).slice(0, 5)) {
        const falsified = falsifySentence(clean(other.sentence), keyTerms)
        if (falsified && falsified !== other.sentence) alts.push(falsified)
        if (alts.length >= 3) break
      }
      if (alts.length < 2) continue
      const options = shuffle([correct, ...alts.slice(0, 3)])
      questions.push({
        q: lang === 'sv'
          ? 'Vilket av följande stämmer med texten?'
          : 'Which of the following is accurate according to the text?',
        options,
        correct: options.indexOf(correct),
        explanation: correct,
        difficulty: 'hard',
      })
    }
  }

  return questions.slice(0, 8)
}

export async function generatePracticeTest(text, lang = 'en') {
  const clean_text = stripMarkdown(text)
  const keyTerms = extractKeyTerms(clean_text, lang, 25)
  const scored = scoreSentences(splitSentences(clean_text), keyTerms, lang)
  const questions = []

  // MC (4)
  const quizQs = await generateQuiz(clean_text, [], lang)
  questions.push(...quizQs.slice(0, 4).map(q => ({ type: 'multiple_choice', ...q })))

  // True/False (3)
  const tfPool = scored.filter(({ sentence }) => sentence.length >= 50 && sentence.length <= 200)
  let tfCount = 0
  for (let i = 0; i < tfPool.length && tfCount < 3; i++) {
    const { sentence } = tfPool[i]
    if (tfCount % 2 === 1) {
      const falsified = falsifySentence(sentence, keyTerms)
      if (falsified && falsified !== sentence) {
        questions.push({
          type: 'true_false', q: falsified, correct: false,
          explanation: lang === 'sv'
            ? `Falskt. Rätt påstående: "${clean(sentence)}"`
            : `False. The correct statement is: "${clean(sentence)}"`,
        })
        tfCount++; continue
      }
    }
    questions.push({
      type: 'true_false', q: clean(sentence), correct: true,
      explanation: lang === 'sv' ? 'Sant — stämmer med texten.' : 'True — consistent with the text.',
    })
    tfCount++
  }

  // Short Answer (3)
  const termSet = new Set(keyTerms.map(t => t.toLowerCase()))
  const usedInTF = new Set(tfPool.slice(0, tfCount).map(f => f.sentence))
  const saPool = scored.filter(({ sentence }) => !usedInTF.has(sentence)).slice(0, 6)

  for (const { sentence } of saPool.slice(0, 3)) {
    const kps = [...new Set(
      (sentence.toLowerCase().match(/[a-zåäö]{5,}/g) || []).filter(w => termSet.has(w))
    )].slice(0, 4)
    const subject = sentence.split(/\s+/).slice(0, 5).join(' ').replace(/[.!?,]+$/, '')
    questions.push({
      type: 'short_answer',
      q: lang === 'sv'
        ? `Förklara vad texten säger om: "${subject}…"`
        : `Explain what the text says about: "${subject}…"`,
      sampleAnswer: clean(sentence),
      keyPoints: kps.length ? kps : keyTerms.slice(0, 3).map(t => t.toLowerCase()),
    })
  }

  return questions
}

export async function generateMagicNotes(text, lang = 'en') {
  const clean_text = stripMarkdown(text)
  const sentences = splitSentences(clean_text)
  const keyTerms = extractKeyTerms(clean_text, lang, 12)
  const definitions = extractDefinitions(clean_text, lang)
  const scored = scoreSentences(sentences, keyTerms, lang)

  // Title
  const first = clean(sentences[0] || '')
  const titleWords = first.split(/\s+/).slice(0, 7).join(' ').replace(/[.!?,:;'"]+$/, '')
  const title = titleWords.length >= 10 ? titleWords.slice(0, 60) : keyTerms.slice(0, 4).join(', ')

  // Summary: 2-3 highest-scoring sentences
  const summary = scored.slice(0, 3).map(s => clean(s.sentence)).join(' ').slice(0, 500)

  // Key terms from real definitions, padded with term+context
  const kts = definitions.slice(0, 8).map(d => ({ term: d.term, definition: clean(d.sentence) }))
  if (kts.length < 4) {
    for (const term of keyTerms) {
      if (kts.length >= 8) break
      if (kts.some(k => k.term.toLowerCase() === term.toLowerCase())) continue
      const rel = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()))
      if (rel) kts.push({ term, definition: clean(rel) })
    }
  }

  // Sections: split top sentences into thematic groups
  //   Use first words of the first sentence in each group as the heading
  const important = scored.slice(0, 12).map(s => clean(s.sentence))
  const secSize = Math.max(1, Math.ceil(important.length / 3))
  const fallbackLabels = lang === 'sv'
    ? ['Introduktion', 'Nyckelkoncept', 'Tillämpning och konsekvenser']
    : ['Introduction', 'Key Concepts', 'Application & Implications']
  const sections = []
  for (let i = 0; i < 3; i++) {
    const points = important.slice(i * secSize, (i + 1) * secSize)
    if (points.length === 0) continue
    // Derive heading from the dominant key term in this group
    const groupText = points.join(' ').toLowerCase()
    const dominant = keyTerms.find(t => groupText.includes(t.toLowerCase()))
    const heading = dominant || fallbackLabels[i]
    sections.push({ heading, points })
  }

  // Quick facts: short punchy sentences or ones with numbers
  const quickFacts = scored
    .filter(({ sentence }) => /\d/.test(sentence) || sentence.length < 130)
    .slice(0, 5)
    .map(s => clean(s.sentence))

  return { title, summary, keyTerms: kts, sections, quickFacts }
}

// ─── SM-2 & PLAN (unchanged) ──────────────────────────────────────────────────

export function sm2(card, quality) {
  let { interval, easeFactor, repetitions } = card
  if (quality >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)
    repetitions += 1
  } else { repetitions = 0; interval = 1 }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)
  const memoryScore = Math.min(100, Math.round((easeFactor - 1.3) / (3.0 - 1.3) * 60 + Math.min(repetitions, 5) / 5 * 40))
  return { interval, easeFactor, repetitions, nextReview: nextReview.toISOString(), memoryScore }
}

export function generatePlan(text) {
  const clean_text = stripMarkdown(text)
  const sentences = clean_text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
    .split(/(?<=[.!?])\s+/).filter(s => s.length > 30)
  const chunks = []
  const sz = Math.max(1, Math.ceil(sentences.length / 5))
  for (let i = 0; i < sentences.length; i += sz) {
    const ch = sentences.slice(i, i + sz)
    const lbl = ch[0].split(' ').slice(0, 5).join(' ').replace(/[^a-zA-Z0-9\s\u00C0-\u024F]/g, '').trim()
    chunks.push({
      name: lbl || `Section ${chunks.length + 1}`,
      sub: `${ch.length} key concept${ch.length !== 1 ? 's' : ''}`,
      dur: `${15 + chunks.length * 5} min`,
      st: chunks.length === 0 ? 'cur' : 'up',
    })
  }
  if (!chunks.length) chunks.push({ name: 'Overview', sub: 'Introduction', dur: '15 min', st: 'cur' })
  return chunks
}
