import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MascotAirie } from '../components/MascotAirie.jsx'

describe('MascotAirie', () => {
  it('renders with idle state', () => {
    const { container } = render(<MascotAirie state="idle" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg.classList.contains('mascot--idle')).toBe(true)
  })

  it('adds wings-up class for alert state', () => {
    const { container } = render(<MascotAirie state="alert" />)
    const svg = container.querySelector('svg')
    expect(svg.classList.contains('airie--wings-up')).toBe(true)
  })

  it('adds wings-up class for wave state', () => {
    const { container } = render(<MascotAirie state="wave" />)
    const svg = container.querySelector('svg')
    expect(svg.classList.contains('airie--wings-up')).toBe(true)
  })

  it('does not add wings-up class for sleep state', () => {
    const { container } = render(<MascotAirie state="sleep" />)
    const svg = container.querySelector('svg')
    expect(svg.classList.contains('airie--wings-up')).toBe(false)
  })

  it('has correct aria-label', () => {
    render(<MascotAirie state="happy" />)
    expect(screen.getByLabelText('Airie is happy')).toBeTruthy()
  })

  it('does not add wings-up class for thinking state', () => {
    const { container } = render(<MascotAirie state="thinking" />)
    const svg = container.querySelector('svg')
    expect(svg.classList.contains('mascot--thinking')).toBe(true)
    expect(svg.classList.contains('airie--wings-up')).toBe(false)
  })
})
