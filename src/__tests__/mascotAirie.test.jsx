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

  it('uses distinct sprites for alert (notify bell) and wave (hand up)', () => {
    // Post-spritesheet update: these used to share one asset; now each has
    // its own dedicated pose extracted from the sprite sheet.
    const { container: c1 } = render(<MascotAirie state="alert" />)
    const { container: c2 } = render(<MascotAirie state="wave" />)
    const src1 = c1.querySelector('img').src
    const src2 = c2.querySelector('img').src
    expect(src1).not.toBe(src2)
  })

  it('renders 4 stacked frames for the walk locomotion cycle', () => {
    const { container } = render(<MascotAirie state="walk" />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(4)
    // Each frame should carry its own .airie-frame-N class
    expect(container.querySelector('.airie-frame-0')).toBeTruthy()
    expect(container.querySelector('.airie-frame-3')).toBeTruthy()
  })

  it('renders 4 stacked frames for the idle hover cycle', () => {
    const { container } = render(<MascotAirie state="idle" />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(4)
  })
})
