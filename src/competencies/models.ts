export interface Skill {
  id: string
  name: string
  description: string
}

export interface Competency {
  id: string
  name: string
  description: string
  skillIds: string[]
}

export interface Certification {
  id: string
  name: string
  issuer: string
  competencyIds: string[]
}

export interface CareerPath {
  id: string
  name: string
  description: string
  certificationIds: string[]
}

export interface Course {
  id: string
  title: string
  domain: string
  moduleIds: string[]
}

export interface Module {
  id: string
  title: string
  questionIds: string[]
}
