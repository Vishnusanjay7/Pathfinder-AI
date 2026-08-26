# Photorealistic 3D Human HR Interviewer Studio Documentation

This directory contains the 3D human avatar models and high-resolution corporate executive office assets used exclusively for the real-time browser-based AI Mock Interview module in the AI Career Coach platform.

## 1. Interviewer Catalog

| File | Interviewer Identity | Role | Gender | Age Profile | Office Environment | License |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `female-1.vrm` / `priya_sharma.jpg` | **Priya Sharma** | Senior Talent Acquisition Lead | Female | 34 | Executive Walnut Desk, Laptop, Leather Notebook | CC0 1.0 Universal / Open Corporate Use |
| `female-2.vrm` / `neha_verma.jpg` | **Neha Verma** | HR Director & People Operations | Female | 39 | Corporate Glass Boardroom, Office Desk, Pen | CC0 1.0 Universal / Open Corporate Use |
| `male-1.vrm` / `arjun_mehta.jpg` | **Arjun Mehta** | VP of Engineering & Tech Lead | Male | 42 | Tech Leadership Office, Monitor, Laptop | CC0 1.0 Universal / Open Corporate Use |
| `male-2.vrm` / `rohit_singh.jpg` | **Rohit Singh** | Global Hiring Manager | Male | 38 | Corporate HR Executive Suite, Wood Office Desk | CC0 1.0 Universal / Open Corporate Use |

---

## 2. 3D Seated Office Studio Architecture

- **Format**: GLTF 2.0 / VRM standard rendered locally in WebGL via Three.js.
- **Seated Human Rigging**: Humanoid skeletal posture engine poses the interviewer seated in an ergonomic high-back office chair with arms forward and hands naturally resting on the executive desk.
- **3D Office Environment**:
  - Executive walnut desk with beveled edge and chrome trim.
  - Slim corporate laptop, leather notebook, metallic pen, and personalized nameplate.
  - Ergonomic high-back contoured leather/mesh office chair.
  - Panoramic corporate architectural glass boardroom backdrop with soft depth-of-field blur.
- **PBR Shader Shading**:
  - Non-toon realistic skin micro-roughness ($0.58$), specular glossy corneal eye reflections ($0.04$), and corporate wool/cotton fabric textures ($0.84$).
- **Studio 4-Point Executive Lighting**:
  - 3200K warm key light, 5600K cool fill light, rim/hair separation light, and desk upward bounce light.
- **Facial & Speech Animation**:
  - Natural randomized blinking (2.5s–5.5s intervals, 160ms curve).
  - Dynamic phonetic visemes (`aa`, `ih`, `ou`, `ee`, `oh`) synchronized with browser SpeechSynthesis audio envelope.
  - 0.3 Hz chest breathing, attentive listening head tilts, speaking nods, and eye micro-saccades.
