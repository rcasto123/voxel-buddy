import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MascotAirie } from '../components/MascotAirie.jsx'

// MascotAirie is now image-based: a <div> wrapper + <img> inside.
// State classes live on the wrapper div; aria-label is on the wrapper too.

describe('MascotAirie', () => {
  it('renders a wrapper div with the correct state class', () => {
    const { container } = render(<MascotAirie state="idle" />)
    const wrapper = container.firstChild
    expect(wrapper).toBeTruthy()
    expect(wrapper.classList.contains('airie--idle')).toBe(true)
  })

  it('renders an img child', () => {
    const { container } = render(<MascotAirie state="idle" />)
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
  })

  it('has correct aria-label on wrapper', () => {
    const { container } = render(<MascotAirie state="happy" />)
    const wrapper = container.firstChild
    expect(wrapper.getAttribute('aria-label')).toBe('Airie is happy')
  })

  it('does not add wings-up class for sleep state', () => {
    const { container } = render(<MascotAirie state="sleep" />)
    const wrapper = container.firstChild
    expect(wrapper.classList.contains('airie--sleep')).toBe(true)
    expect(wrapper.classList.contains('airie--wings-up')).toBe(false)
  })

  it('does not add wings-up class for thinking state', () => {
    const { container } = render(<MascotAirie state="thinking" />)
    const wrapper = container.firstChild
    expect(wrapper.classList.contains('airie--thinking')).toBe(true)
    expect(wrapper.classList.contains('airie--wings-up')).toBe(false)
  })

  it('uses alert image for both alert and wave states', () => {
    const { container: c1 } = render(<MascotAirie state="alert" />)
    const { container: c2 } = render(<MascotAirie state="wave" />)
    const src1 = c1.querySelector('img').src
    const src2 = c2.querySelector('img').src
    expect(src1).toBe(src2)
  })
})
