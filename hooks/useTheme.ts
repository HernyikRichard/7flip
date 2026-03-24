'use client'

import { useContext } from 'react'
import { ThemeContext } from '@/components/layout/ThemeProvider'

export function useTheme() {
  return useContext(ThemeContext)
}
