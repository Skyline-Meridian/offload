// Reference lists seeded into the database (requirements 02 section 9, 03 sections 3 and 5).
// Ids are stable slugs; the seed and the WordPress migration refer to entries by these slugs.

export interface Labelled {
  id: string
  label: string
}

export const positions: Labelled[] = [
  { id: 'tight_head', label: 'Tight Head' },
  { id: 'hooker', label: 'Hooker' },
  { id: 'loose_head', label: 'Loose Head' },
  { id: 'second_row_4', label: 'Second Row (4)' },
  { id: 'second_row_5', label: 'Second Row (5)' },
  { id: 'blindside_flank_6', label: 'Blindside Flank (6)' },
  { id: 'openside_flank_7', label: 'Openside Flank (7)' },
  { id: 'back_row_8', label: 'Back Row (8)' },
  { id: 'scrum_half', label: 'Scrum Half' },
  { id: 'fly_half', label: 'Fly Half' },
  { id: 'inside_centre', label: 'Inside Centre' },
  { id: 'outside_centre', label: 'Outside Centre' },
  { id: 'blindside_wing_11', label: 'Blindside Wing (11)' },
  { id: 'openside_wing_14', label: 'Openside Wing (14)' },
  { id: 'full_back', label: 'Full Back' },
]

export const softSkills: Labelled[] = [
  { id: 'accountability', label: 'Accountability' },
  { id: 'adaptability', label: 'Adaptability' },
  { id: 'buy_in', label: 'Buy-in' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'communication', label: 'Communication' },
  { id: 'composure', label: 'Composure' },
  { id: 'conflict_resolution', label: 'Conflict Resolution' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'creativity', label: 'Creativity' },
  { id: 'critical_thinking', label: 'Critical Thinking' },
  { id: 'decision_making', label: 'Decision-making' },
  { id: 'emotional_intelligence', label: 'Emotional Intelligence' },
  { id: 'empathy', label: 'Empathy' },
  { id: 'focus', label: 'Focus' },
  { id: 'game_management_soft', label: 'Game Management' },
  { id: 'goal_setting', label: 'Goal-setting' },
  { id: 'humility', label: 'Humility' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'listening', label: 'Listening' },
  { id: 'motivation', label: 'Motivation' },
  { id: 'open_mindedness', label: 'Open-mindedness' },
  { id: 'patience', label: 'Patience' },
  { id: 'perseverance', label: 'Perseverance' },
  { id: 'personal_balance', label: 'Personal Balance' },
  { id: 'positivity', label: 'Positivity' },
  { id: 'respect', label: 'Respect' },
  { id: 'resilience', label: 'Resilience' },
  { id: 'self_discipline', label: 'Self-discipline' },
  { id: 'sportsmanship', label: 'Sportsmanship' },
  { id: 'stress_management', label: 'Stress Management' },
  { id: 'teamwork', label: 'Teamwork' },
  { id: 'time_management', label: 'Time Management' },
]

export const gameSkills: Labelled[] = [
  { id: 'line_out_caller', label: 'Line-out caller' },
  { id: 'scrummaging', label: 'Scrummaging' },
  { id: 'laws', label: 'Laws' },
  { id: 'mauling', label: 'Mauling' },
  { id: 'open_play', label: 'Open Play' },
  { id: 'handling', label: 'Handling' },
  { id: 'passing', label: 'Passing' },
  { id: 'game_management_game', label: 'Game Management' },
  { id: 'kicking', label: 'Kicking' },
  { id: 'tackling', label: 'Tackling' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'carrying', label: 'Carrying' },
  { id: 'counter_attack', label: 'Counter Attack' },
  { id: 'unstructured_attack', label: 'Unstructured Attack' },
]

export const qualifications: Labelled[] = [
  { id: 'eqp', label: 'EQP' },
  { id: 'jiff', label: 'JIFF' },
]

export interface LeagueSeed {
  id: string
  name: string
  country: string | null
}

export const leagues: LeagueSeed[] = [
  { id: 'premiership', name: 'Premiership', country: 'GB' },
  { id: 'championship_1', name: 'Championship 1', country: 'GB' },
  { id: 'championship_2', name: 'Championship 2', country: 'GB' },
  { id: 'elite_1', name: 'Élite 1', country: 'FR' },
  { id: 'elite_2', name: 'Élite 2', country: 'FR' },
  { id: 'womens_premier_north_south', name: "Women's Premier North/South", country: 'GB' },
  { id: 'bucs', name: 'BUCS', country: 'GB' },
  { id: 'lit_super_sevens_series', name: 'LIT Super Sevens Series', country: null },
  { id: 'nc1', name: 'NC1', country: null },
  { id: 'nc2', name: 'NC2', country: null },
  { id: 'nc3', name: 'NC3', country: null },
  { id: 'act_premier_womens_competition', name: "ACT Premier Women's Competition", country: null },
  { id: 'nsw_central_coast_competition', name: 'New South Wales Central Coast Competition', country: 'AU' },
  { id: 'division_1_belgium', name: 'Division 1', country: 'BE' },
  { id: 'super_w', name: 'Super W', country: null },
  { id: 'womens_super_league', name: "Women's Super League", country: null },
  { id: 'national_team', name: 'National Team', country: null },
  { id: 'no_league', name: 'No league', country: null },
]

export const industries: Labelled[] = [
  { id: 'sportswear_apparel', label: 'Sportswear and apparel' },
  { id: 'sports_equipment', label: 'Sports equipment' },
  { id: 'nutrition_supplements', label: 'Nutrition and supplements' },
  { id: 'sports_technology_wearables', label: 'Sports technology and wearables' },
  { id: 'health_wellbeing', label: 'Health and wellbeing' },
  { id: 'healthcare_medical', label: 'Healthcare and medical' },
  { id: 'media_broadcasting', label: 'Media and broadcasting' },
  { id: 'events_entertainment', label: 'Events and entertainment' },
  { id: 'banking_finance', label: 'Banking and finance' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'recruitment_careers', label: 'Recruitment and careers' },
  { id: 'education_training', label: 'Education and training' },
  { id: 'travel_hospitality', label: 'Travel and hospitality' },
  { id: 'food_drink', label: 'Food and drink' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'retail_ecommerce', label: 'Retail and e-commerce' },
  { id: 'technology_software', label: 'Technology and software' },
  { id: 'property_construction', label: 'Property and construction' },
  { id: 'charity_community', label: 'Charity and community' },
  { id: 'other', label: 'Other' },
]

export interface PlanSeed {
  key: string
  name: string
  organisationType: 'CLUB' | 'UNION' | 'INSTITUTION' | 'BRAND'
  interval: 'MONTH' | 'YEAR'
  amountPence: number
  sortOrder: number
}

// Starting prices from requirements 06 section 2. Staff can change them later (a change creates a new Stripe price).
export const plans: PlanSeed[] = [
  { key: 'club_monthly', name: 'Clubs Monthly', organisationType: 'CLUB', interval: 'MONTH', amountPence: 3500, sortOrder: 1 },
  { key: 'club_annual', name: 'Clubs Annual', organisationType: 'CLUB', interval: 'YEAR', amountPence: 40000, sortOrder: 2 },
  { key: 'union_monthly', name: 'Unions Monthly', organisationType: 'UNION', interval: 'MONTH', amountPence: 2500, sortOrder: 3 },
  { key: 'union_annual', name: 'Unions Annual', organisationType: 'UNION', interval: 'YEAR', amountPence: 30000, sortOrder: 4 },
  { key: 'university_monthly', name: 'Universities Monthly', organisationType: 'INSTITUTION', interval: 'MONTH', amountPence: 2500, sortOrder: 5 },
  { key: 'university_annual', name: 'Universities Annual', organisationType: 'INSTITUTION', interval: 'YEAR', amountPence: 30000, sortOrder: 6 },
  { key: 'brand_monthly', name: 'Brands Monthly', organisationType: 'BRAND', interval: 'MONTH', amountPence: 2500, sortOrder: 7 },
  { key: 'brand_annual', name: 'Brands Annual', organisationType: 'BRAND', interval: 'YEAR', amountPence: 30000, sortOrder: 8 },
]
