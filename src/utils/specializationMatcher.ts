import { MEDICAL_SPECIALIZATIONS } from '../types';

export interface SpecializationKeywordRule {
  specialization: typeof MEDICAL_SPECIALIZATIONS[number];
  aliases: string[];
  keywords: string[];
  description: string;
  icon: string;
}

export const SPECIALIZATION_RULES: SpecializationKeywordRule[] = [
  {
    specialization: 'Cardiology (Heart & Blood Vessels)',
    aliases: ['cardiology', 'cardiologist', 'heart doctor', 'cardio'],
    keywords: [
      'heart', 'heart diseases', 'heart disease', 'heart attack', 'cardiac', 'chest pain',
      'angina', 'palpitations', 'high bp', 'low bp', 'bp', 'blood pressure', 'hypertension',
      'cholesterol', 'artery', 'valves', 'heart failure', 'arrhythmia', 'ecg', 'coronary'
    ],
    description: 'Heart conditions, hypertension, chest discomfort, and cardiovascular health.',
    icon: '❤️'
  },
  {
    specialization: 'Pulmonology (Lungs & Respiratory)',
    aliases: ['pulmonology', 'pulmonologist', 'chest physician', 'lung doctor'],
    keywords: [
      'lungs', 'lung', 'breathing', 'respiratory', 'asthma', 'cough', 'chronic cough',
      'wheezing', 'shortness of breath', 'breathlessness', 'copd', 'bronchitis',
      'pneumonia', 'chest congestion', 'spo2', 'oxygen', 'smoker cough', 'tb'
    ],
    description: 'Lungs, respiratory tract, asthma, chronic cough, and oxygenation disorders.',
    icon: '🫁'
  },
  {
    specialization: 'Neurology & Stroke Care (Brain & Nerves)',
    aliases: ['neurology', 'neurologist', 'neuro', 'brain doctor'],
    keywords: [
      'brain', 'stroke', 'nerves', 'nerve', 'neurological', 'headache', 'migraine',
      'paralysis', 'seizure', 'epilepsy', 'fits', 'memory loss', 'dementia',
      'alzheimer', 'parkinson', 'tremor', 'numbness', 'tingling', 'dizziness', 'vertigo'
    ],
    description: 'Brain, central nervous system, strokes, chronic migraines, and seizures.',
    icon: '🧠'
  },
  {
    specialization: 'Orthopedics (Bones & Joints)',
    aliases: ['orthopedics', 'orthopedic', 'ortho', 'bone doctor'],
    keywords: [
      'bone', 'bones', 'joints', 'joint', 'fracture', 'arthritis', 'back pain',
      'knee pain', 'spine', 'neck pain', 'spondylitis', 'ligament', 'tear',
      'shoulder pain', 'slip disc', 'hip pain', 'osteoporosis', 'ortho'
    ],
    description: 'Bones, joints, skeletal fractures, spine, and musculoskeletal mobility.',
    icon: '🦴'
  },
  {
    specialization: 'Endocrinology & Diabetology (Hormones & Blood Sugar)',
    aliases: ['endocrinology', 'endocrinologist', 'diabetologist', 'sugar doctor'],
    keywords: [
      'diabetes', 'diabetic', 'sugar', 'blood sugar', 'glucose', 'insulin', 'hba1c',
      'thyroid', 'hypothyroid', 'hyperthyroid', 'hormone', 'hormonal', 'endocrine',
      'obesity', 'metabolism', 'pcos', 'pcod', 'pituitary', 'adrenal'
    ],
    description: 'Diabetes management, thyroid disorders, and endocrine hormone regulation.',
    icon: '🩸'
  },
  {
    specialization: 'Gastroenterology (Digestive Health)',
    aliases: ['gastroenterology', 'gastroenterologist', 'gastro', 'stomach doctor'],
    keywords: [
      'stomach', 'gastric', 'acidity', 'acid reflux', 'gerd', 'heartburn',
      'digestion', 'digestive', 'liver', 'fatty liver', 'jaundice', 'abdomen',
      'stomach pain', 'ulcer', 'vomiting', 'diarrhea', 'constipation', 'bloating',
      'ibs', 'gut', 'bowel', 'colon', 'endoscopy'
    ],
    description: 'Stomach, liver, digestive tract, chronic acidity, and gastrointestinal care.',
    icon: '🩺'
  },
  {
    specialization: 'Nephrology (Kidney Care)',
    aliases: ['nephrology', 'nephrologist', 'renal doctor', 'kidney doctor'],
    keywords: [
      'kidney', 'kidneys', 'renal', 'dialysis', 'urine', 'urinary', 'creatinine',
      'kidney stone', 'kidney stones', 'kidney failure', 'proteinuria', 'edema',
      'swelling legs', 'urea', 'nephro'
    ],
    description: 'Kidney function, dialysis management, renal filtration, and stone care.',
    icon: '💧'
  },
  {
    specialization: 'Dermatology (Skin Care)',
    aliases: ['dermatology', 'dermatologist', 'derma', 'skin doctor'],
    keywords: [
      'skin', 'rash', 'rashes', 'acne', 'pimples', 'hair', 'hair loss', 'itching',
      'itch', 'eczema', 'psoriasis', 'fungal', 'allergy', 'hives', 'dandruff',
      'skin infection', 'scalp', 'pigmentation', 'derma'
    ],
    description: 'Skin diseases, allergies, rashes, scalp conditions, and hair wellness.',
    icon: '🧴'
  },
  {
    specialization: 'Pediatrics (Child Health)',
    aliases: ['pediatrics', 'pediatrician', 'child doctor', 'baby doctor'],
    keywords: [
      'child', 'children', 'baby', 'babies', 'pediatric', 'pediatrics', 'infant',
      'newborn', 'toddler', 'kids', 'kid', 'child health', 'childhood fever',
      'growth', 'vaccination', 'immunization', 'pediatrician'
    ],
    description: 'Comprehensive medical care, vaccinations, and growth monitoring for children.',
    icon: '👶'
  },
  {
    specialization: 'General & Internal Medicine',
    aliases: ['general physician', 'internal medicine', 'family doctor', 'gp'],
    keywords: [
      'fever', 'high fever', 'cold', 'flu', 'cough and cold', 'viral', 'viral fever',
      'weakness', 'fatigue', 'body pain', 'infection', 'headache and fever',
      'general illness', 'routine checkup', 'preventive', 'malaise', 'chills'
    ],
    description: 'Primary care, viral fevers, systemic infections, and routine medical reviews.',
    icon: '🌡️'
  },
  {
    specialization: 'Emergency & Trauma Medicine',
    aliases: ['emergency', 'trauma', 'er doctor', 'casualty'],
    keywords: [
      'emergency', 'urgent', 'trauma', 'accident', 'er', 'casualty', 'injury',
      'head injury', 'bleeding', 'unconscious', 'poisoning', 'burn', 'shock',
      'critical', 'acute', 'resuscitation', 'immediate'
    ],
    description: 'Acute emergency conditions, trauma accidents, and intensive resuscitation.',
    icon: '🚨'
  },
  {
    specialization: 'Psychiatry & Mental Health',
    aliases: ['psychiatry', 'psychiatrist', 'mental health', 'psychologist'],
    keywords: [
      'mental', 'mental health', 'depression', 'anxiety', 'stress', 'panic attack',
      'insomnia', 'sleep disorder', 'bipolar', 'mood swing', 'phobia', 'ptsd',
      'counseling', 'burnout', 'schizophrenia', 'psychiatric'
    ],
    description: 'Mental health, anxiety disorders, clinical depression, and psychological well-being.',
    icon: '🧘'
  },
  {
    specialization: 'ENT (Ear, Nose & Throat)',
    aliases: ['ent', 'ent specialist', 'otolaryngologist', 'ear doctor'],
    keywords: [
      'ear', 'nose', 'throat', 'ent', 'sinus', 'sinusitis', 'hearing', 'tinnitus',
      'ear pain', 'ear discharge', 'tonsil', 'tonsillitis', 'sore throat', 'hoarseness',
      'nasal blockage', 'snoring', 'deviated septum', 'vertigo ear'
    ],
    description: 'Ear infections, sinusitis, throat disorders, hearing, and nasal health.',
    icon: '👂'
  },
  {
    specialization: 'Ophthalmology (Eye Care)',
    aliases: ['ophthalmology', 'ophthalmologist', 'eye doctor', 'optometry'],
    keywords: [
      'eye', 'eyes', 'vision', 'blurred vision', 'cataract', 'glaucoma', 'retina',
      'glasses', 'eye pain', 'red eye', 'dry eyes', 'conjunctivitis', 'squint',
      'lasik', 'eye sight', 'spectacles'
    ],
    description: 'Vision assessment, cataracts, ocular diseases, and corrective eye care.',
    icon: '👁️'
  },
  {
    specialization: "Gynecology & Obstetrics (Women's Health)",
    aliases: ['gynecology', 'gynecologist', 'obstetrics', 'obgyn', 'women doctor'],
    keywords: [
      'women', 'female', 'pregnancy', 'pregnant', 'period', 'periods', 'menstrual',
      'cramps', 'pcos', 'pcod', 'ovary', 'uterus', 'fibroid', 'maternity', 'labor',
      'delivery', 'fertility', 'menopause', 'breast check'
    ],
    description: "Women's healthcare, pregnancy care, reproductive wellness, and gynecology.",
    icon: '🌸'
  },
  {
    specialization: 'Oncology (Cancer Care)',
    aliases: ['oncology', 'oncologist', 'cancer specialist'],
    keywords: [
      'cancer', 'tumor', 'chemo', 'chemotherapy', 'onco', 'oncology', 'malignancy',
      'malignant', 'radiation', 'biopsy', 'carcinoma', 'lymphoma', 'leukemia',
      'sarcoma', 'oncological'
    ],
    description: 'Cancer diagnosis, chemotherapy coordination, oncology staging, and tumor care.',
    icon: '🎗️'
  }
];

export interface MatchResult {
  matchedSpec: typeof MEDICAL_SPECIALIZATIONS[number] | null;
  matchedRule: SpecializationKeywordRule | null;
  matchedKeyword: string | null;
  isExact: boolean;
  score: number;
}

/**
 * Flexible specialization matcher.
 * Matches natural language user queries (e.g. "heart diseases", "chest pain", "lung problem", "rash")
 * and directly redirects / maps to the canonical specialization (e.g. "Cardiology (Heart & Blood Vessels)").
 */
export function matchSpecialization(query: string): MatchResult {
  if (!query || !query.trim()) {
    return { matchedSpec: null, matchedRule: null, matchedKeyword: null, isExact: false, score: 0 };
  }

  const cleanQuery = query.trim().toLowerCase();

  // 1. Direct match with official specialization name
  for (const rule of SPECIALIZATION_RULES) {
    if (rule.specialization.toLowerCase() === cleanQuery) {
      return {
        matchedSpec: rule.specialization,
        matchedRule: rule,
        matchedKeyword: rule.specialization,
        isExact: true,
        score: 100,
      };
    }
  }

  // 2. Partial match on official specialization name
  for (const rule of SPECIALIZATION_RULES) {
    if (rule.specialization.toLowerCase().includes(cleanQuery)) {
      return {
        matchedSpec: rule.specialization,
        matchedRule: rule,
        matchedKeyword: rule.specialization,
        isExact: true,
        score: 90,
      };
    }
  }

  // 3. Exact match with aliases
  for (const rule of SPECIALIZATION_RULES) {
    for (const alias of rule.aliases) {
      if (alias.toLowerCase() === cleanQuery) {
        return {
          matchedSpec: rule.specialization,
          matchedRule: rule,
          matchedKeyword: alias,
          isExact: false,
          score: 85,
        };
      }
    }
  }

  // 4. Exact match with keyword (e.g. user typed "heart diseases" or "chest pain")
  for (const rule of SPECIALIZATION_RULES) {
    for (const kw of rule.keywords) {
      if (kw.toLowerCase() === cleanQuery) {
        return {
          matchedSpec: rule.specialization,
          matchedRule: rule,
          matchedKeyword: kw,
          isExact: false,
          score: 80,
        };
      }
    }
  }

  // 5. Query contains keyword OR keyword contains query
  let bestRule: SpecializationKeywordRule | null = null;
  let bestKw: string | null = null;
  let highestScore = 0;

  for (const rule of SPECIALIZATION_RULES) {
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      if (cleanQuery.includes(kwLower)) {
        const score = 50 + kwLower.length;
        if (score > highestScore) {
          highestScore = score;
          bestRule = rule;
          bestKw = kw;
        }
      } else if (kwLower.includes(cleanQuery) && cleanQuery.length >= 3) {
        const score = 30 + cleanQuery.length;
        if (score > highestScore) {
          highestScore = score;
          bestRule = rule;
          bestKw = kw;
        }
      }
    }
  }

  if (bestRule) {
    return {
      matchedSpec: bestRule.specialization,
      matchedRule: bestRule,
      matchedKeyword: bestKw,
      isExact: false,
      score: highestScore,
    };
  }

  return { matchedSpec: null, matchedRule: null, matchedKeyword: null, isExact: false, score: 0 };
}
