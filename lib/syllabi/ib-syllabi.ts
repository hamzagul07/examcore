/**
 * IB Diploma syllabus files — merged into the unified registry in index.ts.
 */
import ibBiologyHl from './ib-biology-hl.json'
import ibBusinessManagementHl from './ib-business-management-hl.json'
import ibCas from './ib-cas.json'
import ibChemistryHl from './ib-chemistry-hl.json'
import ibComputerScienceHl from './ib-computer-science-hl.json'
import ibDanceHl from './ib-dance-hl.json'
import ibDanceSl from './ib-dance-sl.json'
import ibEconomicsHl from './ib-economics-hl.json'
import ibEnglishALangLitHl from './ib-english-a-lang-lit-hl.json'
import ibEnglishALangLitSl from './ib-english-a-lang-lit-sl.json'
import ibEnglishALiteratureHl from './ib-english-a-literature-hl.json'
import ibEnglishALiteratureSl from './ib-english-a-literature-sl.json'
import ibExtendedEssay from './ib-extended-essay.json'
import ibFilmHl from './ib-film-hl.json'
import ibFilmSl from './ib-film-sl.json'
import ibFrenchBHl from './ib-french-b-hl.json'
import ibFrenchBSl from './ib-french-b-sl.json'
import ibGeographyHl from './ib-geography-hl.json'
import ibGeographySl from './ib-geography-sl.json'
import ibHistoryHl from './ib-history-hl.json'
import ibHistorySl from './ib-history-sl.json'
import ibMathsAaHl from './ib-maths-aa-hl.json'
import ibMathsAiHl from './ib-maths-ai-hl.json'
import ibMusicHl from './ib-music-hl.json'
import ibMusicSl from './ib-music-sl.json'
import ibPhysicsHl from './ib-physics-hl.json'
import ibPhysicsSl from './ib-physics-sl.json'
import ibPsychologyHl from './ib-psychology-hl.json'
import ibSpanishBHl from './ib-spanish-b-hl.json'
import ibSpanishBSl from './ib-spanish-b-sl.json'
import ibTheatreHl from './ib-theatre-hl.json'
import ibTheatreSl from './ib-theatre-sl.json'
import ibTok from './ib-tok.json'
import ibVisualArtsHl from './ib-visual-arts-hl.json'
import ibVisualArtsSl from './ib-visual-arts-sl.json'

type IbSyllabusFile = {
  subjectCode: string
  subjectName: string
  topics: { code: string; name: string; paper: string; paperName: string }[]
}

export const IB_SYLLABI: Record<string, IbSyllabusFile> = {
  'ib-biology-hl': ibBiologyHl as IbSyllabusFile,
  'ib-business-management-hl': ibBusinessManagementHl as IbSyllabusFile,
  'ib-cas': ibCas as IbSyllabusFile,
  'ib-chemistry-hl': ibChemistryHl as IbSyllabusFile,
  'ib-computer-science-hl': ibComputerScienceHl as IbSyllabusFile,
  'ib-dance-hl': ibDanceHl as IbSyllabusFile,
  'ib-dance-sl': ibDanceSl as IbSyllabusFile,
  'ib-economics-hl': ibEconomicsHl as IbSyllabusFile,
  'ib-english-a-lang-lit-hl': ibEnglishALangLitHl as IbSyllabusFile,
  'ib-english-a-lang-lit-sl': ibEnglishALangLitSl as IbSyllabusFile,
  'ib-english-a-literature-hl': ibEnglishALiteratureHl as IbSyllabusFile,
  'ib-english-a-literature-sl': ibEnglishALiteratureSl as IbSyllabusFile,
  'ib-extended-essay': ibExtendedEssay as IbSyllabusFile,
  'ib-film-hl': ibFilmHl as IbSyllabusFile,
  'ib-film-sl': ibFilmSl as IbSyllabusFile,
  'ib-french-b-hl': ibFrenchBHl as IbSyllabusFile,
  'ib-french-b-sl': ibFrenchBSl as IbSyllabusFile,
  'ib-geography-hl': ibGeographyHl as IbSyllabusFile,
  'ib-geography-sl': ibGeographySl as IbSyllabusFile,
  'ib-history-hl': ibHistoryHl as IbSyllabusFile,
  'ib-history-sl': ibHistorySl as IbSyllabusFile,
  'ib-maths-aa-hl': ibMathsAaHl as IbSyllabusFile,
  'ib-maths-ai-hl': ibMathsAiHl as IbSyllabusFile,
  'ib-music-hl': ibMusicHl as IbSyllabusFile,
  'ib-music-sl': ibMusicSl as IbSyllabusFile,
  'ib-physics-hl': ibPhysicsHl as IbSyllabusFile,
  'ib-physics-sl': ibPhysicsSl as IbSyllabusFile,
  'ib-psychology-hl': ibPsychologyHl as IbSyllabusFile,
  'ib-spanish-b-hl': ibSpanishBHl as IbSyllabusFile,
  'ib-spanish-b-sl': ibSpanishBSl as IbSyllabusFile,
  'ib-theatre-hl': ibTheatreHl as IbSyllabusFile,
  'ib-theatre-sl': ibTheatreSl as IbSyllabusFile,
  'ib-tok': ibTok as IbSyllabusFile,
  'ib-visual-arts-hl': ibVisualArtsHl as IbSyllabusFile,
  'ib-visual-arts-sl': ibVisualArtsSl as IbSyllabusFile,
}
