// Renderizado adaptable: la pregunta es protagonista y no hay scroll horizontal a 360px.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';

describe('Home adaptable a móviles', () => {
  it('muestra nombre, lema y acciones principales', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Cálculo/i)).toBeInTheDocument();
    expect(screen.getByText(/Resuelve, avanza/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingresar a una partida/i)).toBeInTheDocument();
    expect(screen.getByText(/Soy profesor/i)).toBeInTheDocument();
  });
});
