import { categories } from '../../../data/categories'
import { questions } from '../../../data/bank'
import type { Course, Module } from '../../../competencies/models'

export const ignitionCoreModules: Module[] = categories.map((category) => ({
  id: `ignition-core-${category.name.toLowerCase().replaceAll(' ', '-')}`,
  title: category.name,
  questionIds: questions.filter((question) => question.category === category.name).map((question) => question.id),
}))

export const ignitionCoreCourse: Course = {
  id: 'ignition-core',
  title: 'Ignition Core',
  domain: 'Industrial Automation',
  moduleIds: ignitionCoreModules.map((module) => module.id),
}
